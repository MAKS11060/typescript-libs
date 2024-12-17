import {ulid} from 'jsr:@std/ulid'
import {chunk} from 'jsr:@std/collections/chunk'
import {z} from 'zod'

type CreateOptions<
  //
  S extends z.Schema,
  P extends keyof z.input<S>,
  T extends Exclude<keyof z.input<S>, P>
> = {
  /** `kv prefix` */
  prefix: string
  primaryKey: P
  generateID?: () => z.input<S>[P]
  index: T[] | Exclude<keyof z.input<S>, P>[]
  indexOptions?: {
    [K in T]?: {
      /** Generate addition `id` for index */
      unique?: boolean | (() => Deno.KvKeyPart)
      transform?: (val: z.input<S>[K]) => z.input<S>[K]
    }
  }
}

// const s = z.object({})
// type EmptySchema = typeof s
type EmptySchema = z.ZodObject<{}, 'strip', z.ZodTypeAny, {}, {}>

type ModelOptions<
  //
  S extends z.Schema,
  P extends keyof z.input<S>,
  T extends z.input<S>
> = CreateOptions<S, P, T>

type ModelCreateOptions<P> = {
  /** expireIn in `milliseconds` */
  expireIn?: number
  /** override `AtomicOperation` for one transaction */
  op?: Deno.AtomicOperation
  /** Set `Primary` key */
  key?: P
}

export const createModel = <
  S extends z.Schema = z.Schema,
  // primaryKey
  P extends keyof z.input<S> = z.input<S>,
  // keys without primaryKey
  T extends Exclude<keyof z.input<S>, P> = Exclude<keyof z.input<S>, P>
>(
  kv: Deno.Kv,
  schema: S,
  config: ModelOptions<S, P, T>
) => {
  type Input = z.input<S>
  type InputWithoutKey = Omit<Input, P>
  type InputPrimaryKeyType = Input[P]
  type Output = z.output<S>
  type OutputPrimaryKeyType = Output[P]

  type InputType = Output[T]
  type OutputT = Output[T]

  // default key generator
  config.generateID ??= ulid

  const updateSchema = (schema as any as EmptySchema)
    .omit({
      [config.primaryKey]: true,
    } as Output)
    .partial()

  const makePrefixKey = (indexKey: string | number | symbol) => `${config.prefix}-${indexKey as string}`

  const create = (input: InputWithoutKey, options?: ModelCreateOptions<Input[P]>) => {
    const key = options?.key ?? config.generateID!()

    // validate
    const output = schema.parse({[config.primaryKey]: key, ...input})
    const op = options?.op ?? kv.atomic()

    op.set([config.prefix, key], output, options) // primary

    // update index
    for (const index of config.index as T[]) {
      if (!output[index]) continue

      const indexOptions = config.indexOptions?.[index]
      const value = indexOptions?.transform ? indexOptions.transform(output[index]) : output[index]

      // 4-5
      if (config?.indexOptions?.[index]?.unique) {
        const newSecondaryKey = [makePrefixKey(index), value, output[config.primaryKey]]
        op.set(newSecondaryKey, null, options)
        op.check({key: newSecondaryKey, versionstamp: null})
      } else {
        const newKey = [makePrefixKey(index), value]
        op.set(newKey, output[config.primaryKey], options)
        op.check({key: newKey, versionstamp: null})
      }
    }

    let isCommit = false
    return {
      get data(): Output {
        return output
      },
      get key() {
        return key
      },
      get op() {
        if (isCommit) throw new Error('Transaction is already commited')
        return op
      },
      async commit() {
        if (isCommit) throw new Error('Transaction is already commited')
        isCommit = true

        // check is exist
        for (const indexKey of config.index as T[]) {
          let value = output[indexKey]
          if (!value) continue

          // optional transform
          if (config?.indexOptions?.[indexKey]?.transform) {
            value = config?.indexOptions?.[indexKey]?.transform(value)
          }

          const prefix = makePrefixKey(indexKey)
          const key = [prefix, value] // 'user-username' 'index'
          const indexRes = await kv.get<Output[T]>(key)
          if (indexRes.versionstamp) {
            throw new Error(`key is already exists ${key}`)
          }
        }

        const res = await op.commit()
        if (res.ok) {
          return {value: output, ...res} as {value: Output} & Deno.KvCommitResult
        } else {
          return {ok: false, value: null} as {ok: false; value: null}
        }
      },
    }
  }

  // Find
  const find = async (key: Output[P]) => {
    const res = await kv.get<Output>([config.prefix, key])
    return res.value
  }

  type FindByIndex = {
    // Resolve `object`
    (indexKey: T, value: OutputT, options: {resolve: true}): Promise<Output>
    // Get object `primary key`
    (indexKey: T, value: OutputT, options?: {resolve?: false}): Promise<OutputT>
  }

  const findByIndex: FindByIndex = async (indexKey, value, options) => {
    // optional transform
    if (config?.indexOptions?.[indexKey]?.transform) {
      value = config?.indexOptions?.[indexKey]?.transform(value)
    }

    const prefix = makePrefixKey(indexKey)
    const key = [prefix, value] // 'user-username' 'index'

    if (config?.indexOptions?.[indexKey]?.unique) {
      throw new Error("findByIndex not available for 'uniq' index")
    }

    const indexRes = await kv.get<Output[T]>(key)
    if (!indexRes.value) throw new Error(`Index "${key}" is undefined`)

    return options?.resolve ? find(indexRes.value) : indexRes.value
  }

  type FindManyByIndex = {
    // Resolve `object[]`
    (indexKey: T, value: Output[T], options: {resolve: true}): Promise<Output[]>
    // Get object[] `primary key`
    (indexKey: T, value: Output[T], options?: {resolve?: false}): Promise<Output[T][]>
  }

  // 'prefix-indexKey' 'index' 'primaryKey' => get[]
  const resolveUniqIndex = async (prefix: string, keys: Deno.KvKeyPart[]): Promise<Output[]> => {
    const res = await Promise.all(
      chunk(keys, 10).map((keys) => {
        return kv.getMany(
          keys.map((key) => {
            // console.log([config.prefix, key])
            return [config.prefix, key]
          })
        )
      })
    )
    return res.flat().map((v) => v.value)
  }

  const findManyByIndex: FindManyByIndex = async (indexKey, value, options) => {
    // optional transform
    if (config?.indexOptions?.[indexKey]?.transform) {
      value = config?.indexOptions?.[indexKey]?.transform(value)
    }

    const prefix = makePrefixKey(indexKey)
    const key = [prefix, value] // 'prefix-indexKey' 'index' 'primaryKey'

    if (config?.indexOptions?.[indexKey]?.unique) {
      const iter = kv.list({prefix: key})
      const primaryKeys = await Array.fromAsync(iter, (v) => v.key[2])

      return options?.resolve ? resolveUniqIndex(prefix, primaryKeys) : primaryKeys
    }

    throw new Error("Index options must be a 'uniq'. Use findByIndex")
  }

  // Update
  const update = async (
    key: OutputPrimaryKeyType,
    newValue:
      | Partial<InputWithoutKey>
      | ((currentValue: Output) => Partial<InputWithoutKey> | Promise<Partial<InputWithoutKey>>),
    options?: {expireIn?: number}
  ) => {
    // 1
    const currentObject = await find(key)
    if (!currentObject) {
      throw new Error('Resolve by primary key')
    }

    newValue = typeof newValue === 'function' ? await newValue(currentObject) : newValue

    // 2
    const output = {
      [config.primaryKey]: currentObject[config.primaryKey],
      ...updateSchema.parse({
        ...currentObject,
        ...newValue,
      }),
    } as Output

    // 3
    const op = kv.atomic()
    op.set([config.prefix, output[config.primaryKey]], output, options)

    for (const index of config.index as T[]) {
      if (!newValue[index]) continue

      const indexOptions = config.indexOptions?.[index]
      const value = indexOptions?.transform ? indexOptions.transform(output[index]) : output[index]

      // 4-5
      if (config?.indexOptions?.[index as T]?.unique) {
        const currSecondaryKey = [makePrefixKey(index), currentObject[index], currentObject[config.primaryKey]]
        const newSecondaryKey = [makePrefixKey(index), value, output[config.primaryKey]]
        op.delete(currSecondaryKey)
        op.set(newSecondaryKey, null, options)
        op.check({key: newSecondaryKey, versionstamp: null})
      } else {
        const currKey = [makePrefixKey(index), currentObject[index]]
        const newKey = [makePrefixKey(index), value]
        if (currentObject[index]) op.delete(currKey)
        op.set(newKey, output[config.primaryKey], options)
        op.check({key: newKey, versionstamp: null})
      }
    }

    const res = await op.commit()
    if (!res.ok) {
      throw new Error('Update data failed')
    }

    return output
  }

  /*
  1 find primary id by secondary
  2 merge new data with old
  3 update primary object
  4 delete preview index
  5 create new index
  */
  const updateByIndex = async (
    indexKey: T,
    currentValue: OutputT,
    newValue: Partial<InputWithoutKey>,
    options?: {expireIn?: number}
  ) => {
    const currentKey = [makePrefixKey(indexKey), currentValue]
    // console.log({currentKey})

    // 0
    const primaryKeyRes = await kv.get<OutputT>(currentKey)
    if (!primaryKeyRes.value) {
      throw new Error(`Unknown secondary id: ${currentKey}`)
    }

    // 1
    const currentObject = await find(primaryKeyRes.value)
    if (!currentObject) {
      throw new Error('Resolve by primary key')
    }

    // 2
    const output = {
      [config.primaryKey]: currentObject[config.primaryKey],
      ...updateSchema.parse({
        ...currentObject,
        ...newValue,
      }),
    } as Output

    // 3
    const op = kv.atomic()
    op.set([config.prefix, output[config.primaryKey]], output, options)

    for (const index of config.index as T[]) {
      if (!newValue[index]) continue
      // console.log('INDEX', index)

      const indexOptions = config.indexOptions?.[index]
      const value = indexOptions?.transform ? indexOptions.transform(output[index]) : output[index]

      // 4-5
      if (config?.indexOptions?.[index]?.unique) {
        const currSecondaryKey = [makePrefixKey(index), currentObject[index], currentObject[config.primaryKey]]
        const newSecondaryKey = [makePrefixKey(index), value, output[config.primaryKey]]
        op.delete(currSecondaryKey)
        op.set(newSecondaryKey, null, options)
        op.check({key: newSecondaryKey, versionstamp: null})
      } else {
        const currKey = [makePrefixKey(index), currentObject[index]]
        const newKey = [makePrefixKey(index), value]
        op.delete(currKey)
        op.set(newKey, output[config.primaryKey], options)
        op.check({key: newKey, versionstamp: null})
      }
    }

    const res = await op.commit()
    if (!res.ok) {
      throw new Error('Update data failed')
    }

    return output
  }

  // Delete
  const remove = async (key: OutputPrimaryKeyType) => {
    const currentObject = await find(key)
    if (!currentObject) {
      throw new Error('Invalid find result')
    }

    const op = kv.atomic()

    op.delete([config.prefix, currentObject[config.primaryKey]])

    for (const index of config.index) {
      if (config?.indexOptions?.[index as T]?.unique) {
        const currSecondaryKey = [makePrefixKey(index), currentObject[index], currentObject[config.primaryKey]]
        op.delete(currSecondaryKey)
      } else {
        const currKey = [makePrefixKey(index), currentObject[index]]
        op.delete(currKey)
      }
    }

    const res = await op.commit()
    if (!res.ok) {
      throw new Error('Update data failed')
    }
    return res.ok
  }

  const removeByIndex = (indexKey: T, value: Output[T]) => {
    findByIndex(indexKey, value)
  }

  return {
    setKV: (newKV: Deno.Kv) => (kv = newKV),
    create,
    find,
    findByIndex,
    findManyByIndex,
    update,
    updateByIndex,
    remove,
  }
}
