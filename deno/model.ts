import {chunk} from '@std/collections/chunk'
import {ulid} from '@std/ulid/ulid'
import type {StandardSchemaV1} from 'npm:@standard-schema/spec'
import {standardValidate} from '../lib/standardValidate.ts'
import {KvPageOptions, getKvPage} from './kvLib.ts'

type GetPrimitiveKey<TObject> = {
  [K in keyof TObject as TObject[K] extends Deno.KvKeyPart
    ? undefined extends TObject[K]
      ? never
      : K
    : never]: TObject[K]
}

type PrimaryKeyType = 'ulid' | 'uuid4' | (() => string)

type ModelOptions<
  Schema extends StandardSchemaV1,
  IndexKey extends string,
  Output = StandardSchemaV1.InferOutput<Schema>
> = {
  prefix: string
  /**
   * Available types for `primaryKey`:
   * 1. {@linkcode Uint8Array}
   * 2. {@linkcode String}
   * 3. {@linkcode Number}
   * 4. {@linkcode BigInt}
   * 5. {@linkcode Boolean}
   */
  primaryKey: keyof GetPrimitiveKey<Output>
  /** @default ulid */
  primaryKeyType?: PrimaryKeyType
  index: IndexOptions<IndexKey, Output>
}

type IndexOptions<IndexKey extends string, Output> = {
  [K in IndexKey]: {
    /** @default one */
    relation?: 'one' | 'many'
    key: (value: Output) => Deno.KvKeyPart
  }
}

type IndexOptionsResult<Index extends IndexOptions<any, any>> = {
  [K in keyof Index]: {
    type: Index[K]['relation'] extends 'many' ? 'many' : 'one'
    key: ReturnType<Index[K]['key']>
  }
}

type ChoiceOption<T extends 'one' | 'many', One, Many> = T extends 'one' //
  ? One
  : T extends 'many'
  ? Many
  : never

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

export const createKvInstance = (kv: Deno.Kv) => {
  const model = <
    Schema extends StandardSchemaV1, //
    Options extends ModelOptions<Schema, string>
  >(
    schema: Schema,
    modelOptions: Options
  ) => {
    type Input = StandardSchemaV1.InferInput<Schema>
    type Output = StandardSchemaV1.InferOutput<Schema>

    type IndexMap = IndexOptionsResult<Options['index']> // {a: IndexOptions, b: IndexOptions}
    type IndexKey = keyof Options['index'] // 'a' | 'b'

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

    const _prefixKey = (indexKey: string) => `${modelOptions.prefix}-${indexKey}`

    const _commit = async <T>(op: Deno.AtomicOperation, val: T, type: string) => {
      const res = await op.commit()
      if (!res.ok) {
        console.error(`%c[KV|${type}|${modelOptions.prefix}]`, 'color: green', 'Error')
        throw new Error('Commit failed', {cause: 'duplicate detected'})
      }

      return val as T
    }

    // CREATE
    const create = async (input: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>) => {
      const key = options?.key ?? generateKey()
      const op = options?.op ?? kv.atomic()

      const output = standardValidate(schema, {
        ...input,
        [modelOptions.primaryKey]: key,
      })

      // primary
      const primaryKey = output[modelOptions.primaryKey] as Deno.KvKeyPart // primaryKey
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

      return options?.transaction ? output : _commit(op, output, 'create')
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
    type FindByIndex = {
      // Find primary keys
      <K extends IndexKey>(
        key: K,
        value: IndexMap[K]['key'],
        options?: IndexMap[K]['type'] extends 'one'
          ? FindNoResolve
          : IndexMap[K]['type'] extends 'many'
          ? FindNoResolve & KvPageOptions<PrimaryKeyType>
          : never
      ): Promise<
        IndexMap[K]['type'] extends 'one'
          ? PrimaryKeyType
          : IndexMap[K]['type'] extends 'many'
          ? PrimaryKeyType[]
          : never
      >
      // Find and resolve primary object
      <K extends IndexKey>(
        key: K,
        value: IndexMap[K]['key'],
        options: IndexMap[K]['type'] extends 'one'
          ? FindResolve
          : IndexMap[K]['type'] extends 'many'
          ? FindResolve & KvPageOptions<PrimaryKeyType>
          : never
      ): Promise<
        IndexMap[K]['type'] extends 'one' //
          ? Output
          : IndexMap[K]['type'] extends 'many'
          ? Output[]
          : never
      >
    }

    const findByIndex: FindByIndex = async (indexKey: string, secondaryKey, options): Promise<any> => {
      const indexOption = modelOptions.index[indexKey]
      // const indexKey = key
      // const secondaryKey = value

      if (!indexOption.relation || indexOption.relation === 'one') {
        const key = [_prefixKey(indexKey), secondaryKey] // ['prefix-indexKey', 'indexVal']

        const indexRes = await kv.get<PrimaryKeyType>(key)
        if (!indexRes.value) throw new Error(`[KV|findByIndex] index: ${key} is undefined`)
        return options?.resolve ? find(indexRes.value) : indexRes.value
      } else if (indexOption.relation === 'many') {
        const key = [_prefixKey(indexKey), secondaryKey]
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
    type UpdateOptions = Omit<CreateOptions<never>, 'key'>
    type Update = {
      (key: PrimaryKeyType, input: Partial<InputWithoutKey>, options?: UpdateOptions): Promise<Output>
      (
        key: PrimaryKeyType,
        handler: (value: Output) => Promise<Partial<InputWithoutKey>> | Partial<InputWithoutKey> | Promise<void> | void,
        options?: UpdateOptions
      ): Promise<Output>
    }

    const update: Update = async (key, handler, options) => {
      const value = await find(key)
      if (!value) return null

      const {[modelOptions.primaryKey]: primaryKey, ...curValue} = value
      const {[modelOptions.primaryKey]: _, ...newValueRaw} =
        typeof handler === 'function' ? (await handler(value)) ?? value : handler

      // make new obj
      const newValue = standardValidate(schema, {
        [modelOptions.primaryKey]: primaryKey,
        // ...value,
        ...curValue,
        ...newValueRaw,
      })

      // primary
      const op = options?.op ?? kv.atomic()
      op.set([modelOptions.prefix, primaryKey as Deno.KvKeyPart], newValue, options) // ['prefix', 'primaryKey'] => object

      // index
      for (const indexKey in modelOptions.index) {
        const indexOption = modelOptions.index[indexKey]
        const secondaryKey = indexOption.key(newValue) // indexVal
        // skip unchanged index
        if (secondaryKey === indexOption.key(value)) continue

        if (!indexOption.relation || indexOption.relation === 'one') {
          const prevKey = [_prefixKey(indexKey), indexOption.key(curValue)]
          op.delete(prevKey)

          const key = [_prefixKey(indexKey), secondaryKey] // ['prefix-indexKey', 'indexVal']
          op.set(key, primaryKey, options) // key => primaryKey
          if (!options?.force) op.check({key, versionstamp: null})
        } else if (indexOption.relation === 'many') {
          const prevKey = [_prefixKey(indexKey), indexOption.key(curValue), primaryKey as Deno.KvKeyPart]
          op.delete(prevKey)

          const key = [_prefixKey(indexKey), secondaryKey, primaryKey as Deno.KvKeyPart] // ['prefix-indexKey', 'indexVal', 'primaryKey']
          op.set(key, null, options) // key => null
          if (!options?.force) op.check({key, versionstamp: null})
        }
      }

      return options?.transaction ? newValue : _commit(op, newValue, 'update')
    }

    // DELETE
    type RemoveOptions = Pick<CreateOptions<never>, 'op' | 'transaction'>
    type RemoveByIndexOptions = RemoveOptions

    const remove = async (key: PrimaryKeyType, options?: RemoveOptions) => {
      const value = await find(key)
      if (!value) return null

      const op = options?.op ?? kv.atomic()
      op.delete([modelOptions.prefix, key as Deno.KvKeyPart]) // primary

      const {[modelOptions.primaryKey]: primaryKey} = value

      // index
      for (const indexKey in modelOptions.index) {
        const indexOption = modelOptions.index[indexKey]
        const secondaryKey = indexOption.key(value) // indexVal

        if (!indexOption.relation || indexOption.relation === 'one') {
          const key = [_prefixKey(indexKey), secondaryKey] // ['prefix-indexKey', 'indexVal']
          console.log({key})
          op.delete(key)
        } else if (indexOption.relation === 'many') {
          const key = [_prefixKey(indexKey), secondaryKey, primaryKey as Deno.KvKeyPart] // ['prefix-indexKey', 'indexVal', 'primaryKey']
          console.log({key})
          op.delete(key)
        }
      }

      return options?.transaction ? true : _commit(op, true, 'remove')
    }

    const removeByIndex = async <Key extends IndexKey>(
      key: Key,
      value: IndexMap[Key]['key'],
      // options?: IndexMap[Key]['type'] extends 'one'
      //   ? RemoveByIndexOptions
      //   : IndexMap[Key]['type'] extends 'many'
      //   ? RemoveByIndexOptions & KvPageOptions<PrimaryKeyType>
      //   : never
      options?: ChoiceOption<
        IndexMap[Key]['type'],
        RemoveByIndexOptions,
        RemoveByIndexOptions & KvPageOptions<PrimaryKeyType>
      >
    ) => {
      const op = options?.op ?? kv.atomic()
      const res = await findByIndex(key, value, options as any)
      const indexOption = modelOptions.index[key as string]

      if (!indexOption.relation || indexOption.relation === 'one') {
        return await remove(res as PrimaryKeyType)
      } else if (indexOption.relation === 'many') {
        for (const item of res as PrimaryKeyType[]) {
          await remove(item, {op, transaction: true})
        }
        // return true
      }

      return options?.transaction ? true : _commit(op, true, 'removeByIndex')
    }

    return {
      create,

      find,
      findMany,
      findByIndex,

      update,

      remove,
      removeByIndex,
    }
  }

  return {model}
}
