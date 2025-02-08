import {chunk} from '@std/collections/chunk'
import {ulid} from '@std/ulid/ulid'
import type {StandardSchemaV1} from 'npm:@standard-schema/spec'
import {KvPageOptions, getKvPage} from './kvLib.ts'

const standardValidate = <T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>
): StandardSchemaV1.InferOutput<T> => {
  const result = schema['~standard'].validate(input)
  if (result instanceof Promise) {
    throw new TypeError('Schema validation must be synchronous')
  }

  // if the `issues` field exists, the validation failed
  if (result.issues) {
    throw new Error(JSON.stringify(result.issues, null, 2))
  }

  return result.value
}

// MODEL
type PrimaryKeyType = 'ulid' | 'uuid4' | (() => string)

type ModelOptions<Schema extends StandardSchemaV1, Index extends string> = {
  prefix: string // model name
  primaryKey: keyof StandardSchemaV1.InferOutput<Schema> // alias for 'z.output'
  /** @default ulid  */
  primaryKeyType?: PrimaryKeyType
  index: {
    [K in Index]: {
      /** @default one  */
      relation?: 'one' | 'many'
      key: (value: StandardSchemaV1.InferOutput<Schema>) => /* unknown */ Deno.KvKeyPart
      // TODO: add post transform, before save
    }
  }
}

type ModelOptionsToIndexValueType<T extends ModelOptions<any, string>> = {
  [K in keyof T['index']]: ReturnType<T['index'][K]['key']>
}
type ModelOptionsToIndexRelationType<T extends ModelOptions<any, string>> = {
  [K in keyof T['index']]: T['index'][K]['relation'] extends 'many' ? 'many' : 'one'
}

//
interface CreateOptions<Key> {
  /** Set `Primary` key */
  key?: Key
  /** expireIn in `milliseconds` */
  expireIn?: number
  /** @default false - Don't check before rewriting */
  force?: boolean
  /** override `AtomicOperation` for one transaction */
  op?: Deno.AtomicOperation
  /** @default false - Prevents saves. To combine into one transaction */
  transaction?: boolean
}

export const createModelSource = (kv: Deno.Kv) => {
  const model = <Schema extends StandardSchemaV1, Index extends string, Options extends ModelOptions<Schema, Index>>(
    schema: Schema,
    modelOptions: Options
  ) => {
    type IndexValueType = ModelOptionsToIndexValueType<Options>
    type IndexRelationType = ModelOptionsToIndexRelationType<Options>

    // IO
    type Input = StandardSchemaV1.InferInput<Schema>
    type Output = StandardSchemaV1.InferOutput<Schema>

    type PrimaryKey = Options['primaryKey']
    type PrimaryKeyType = Output[PrimaryKey]
    type InputWithoutKey = Omit<Input, PrimaryKey>

    // PrimaryKey generator
    let generateKey = ulid
    if (modelOptions.primaryKeyType === 'uuid4') {
      generateKey = crypto.randomUUID
    } else if (typeof modelOptions.primaryKeyType === 'function') {
      generateKey = modelOptions.primaryKeyType
    }

    // const indexKeys = Object.keys(modelOptions.indexOptions) as Index[]

    // CREATE
    const create = async (input: InputWithoutKey, options?: CreateOptions<PrimaryKey>) => {
      const key = options?.key ?? generateKey()
      const op = options?.op ?? kv.atomic()

      const output = standardValidate(schema, {
        ...input,
        [modelOptions.primaryKey]: key,
      })

      // return _create(op, output, modelOptions, options)

      const primaryKey = output[modelOptions.primaryKey] as Deno.KvKeyPart // primaryKey

      // primary
      op.set([modelOptions.prefix, primaryKey], output, options) // ['prefix', 'primaryKey'] => object

      // index
      for (const indexKey in modelOptions.index) {
        const indexOption = modelOptions.index[indexKey]
        const secondaryKey = indexOption.key(output) // indexVal

        if (!indexOption.relation || indexOption.relation === 'one') {
          const key = [`${modelOptions.prefix}-${indexKey}`, secondaryKey] // ['prefix-indexKey', 'indexVal']
          op.set(key, primaryKey, options) // key => primaryKey
          if (!options?.force) op.check({key, versionstamp: null})
        } else if (indexOption.relation === 'many') {
          const key = [`${modelOptions.prefix}-${indexKey}`, secondaryKey, primaryKey] // ['prefix-indexKey', 'indexVal', 'primaryKey']
          op.set(key, null, options) // key => null
          if (!options?.force) op.check({key, versionstamp: null})
        }
      }

      if (options?.transaction) return output

      const res = await op.commit()
      if (!res.ok) {
        console.error(`%c[KV|Create|${modelOptions.prefix}]`, 'color: green', 'Error')
        throw new Error('Commit failed', {cause: 'duplicate detected'})
      }

      return output
    }

    // FIND
    const find = async (key: PrimaryKeyType) => {
      const _key = [modelOptions.prefix, key] as Deno.KvKey
      const res = await kv.get<Output>(_key)
      return res.value
    }

    const findMany = async (options: KvPageOptions<PrimaryKeyType>) => {
      const kvPage = await getKvPage<Output, PrimaryKeyType>(kv, [modelOptions.prefix], options)
      return kvPage.map((v) => v.value)
    }

    // FIND by index
    type FindResolve = {resolve: true}
    type FindNoResolve = {resolve?: false}
    // TODO: simplify types
    type FindByIndex = {
      // Find and resolve primary object
      <K extends Index /* keyof IndexValueType */>(
        key: K,
        value: IndexValueType[K],
        options: IndexRelationType[K] extends 'one'
          ? FindResolve
          : IndexRelationType[K] extends 'many'
          ? FindResolve & KvPageOptions<PrimaryKeyType> // additional options for relation 'many'
          : never
      ): Promise<
        IndexRelationType[K] extends 'one' //
          ? Output
          : IndexRelationType[K] extends 'many'
          ? Output[]
          : never
      >
      // Find primary ids
      <K extends Index /* keyof IndexValueType */>(
        key: K,
        value: IndexValueType[K],
        options?: IndexRelationType[K] extends 'one'
          ? FindNoResolve
          : IndexRelationType[K] extends 'many'
          ? FindNoResolve & KvPageOptions<PrimaryKeyType> // additional options for relation 'many'
          : never
      ): Promise<
        IndexRelationType[K] extends 'one'
          ? IndexValueType[K]
          : IndexRelationType[K] extends 'many'
          ? IndexValueType[K][]
          : never
      >
    }

    const findByIndex: FindByIndex = async (indexKey, secondaryKey, options): any => {
      const indexOption = modelOptions.index[indexKey]
      // const indexKey = key
      // const secondaryKey = value

      if (!indexOption.relation || indexOption.relation === 'one') {
        const key = [`${modelOptions.prefix}-${indexKey}`, secondaryKey] // ['prefix-indexKey', 'indexVal']

        const indexRes = await kv.get<PrimaryKeyType>(key)
        if (!indexRes.value) throw new Error(`[KV|findByIndex] index: ${key} is undefined`)
        return options?.resolve ? find(indexRes.value) : indexRes.value
      } else if (indexOption.relation === 'many') {
        const key = [`${modelOptions.prefix}-${indexKey}`, secondaryKey]
        const kvPage = await getKvPage<PrimaryKeyType, PrimaryKeyType>(
          kv,
          key,
          options as KvPageOptions<PrimaryKeyType>
        )

        if (options?.resolve) {
          // kvPage[30] => kvPage[10][3] => kvPage.map(page.key => [prefix, primaryKey]) => kv.getMany()
          const res = await Promise.all(
            chunk(kvPage, 10).map((page) => {
              return kv.getMany<Output[]>(
                page.map(({key}) => {
                  return [modelOptions.prefix, key.at(-1)!]
                })
              )
            })
          )

          return res
            .flat()
            .filter((v) => v.versionstamp)
            .map((v) => v.value)
        }

        // kvPage.map(page.key => primaryKey)
        return kvPage.map((v) => v.key.at(-1)! /* primaryKey */)
      }

      throw new Error('[KV|findByIndex] undefined behaver')
    }

    // UPDATE
    type Update = {
      (key: PrimaryKeyType, input: Partial<InputWithoutKey>): Promise<Output>
      (
        key: PrimaryKeyType,
        handler: (value: Output) => Promise<Partial<InputWithoutKey>> | Partial<InputWithoutKey>
      ): Promise<Output>
    }

    const update: Update = async (key, handler) => {
      const value = await find(key)
      if (!value) return null

      const newValue = typeof handler === 'function' ? await handler(value) : handler

    }

    const updateByIndex = () => {}

    return {
      create,

      find,
      findMany,
      findByIndex,

      update,
      updateByIndex,
    }
  }

  return {model}
}
