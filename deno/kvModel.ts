import { chunk } from '@std/collections/chunk'
import { ulid } from '@std/ulid'
import { z } from 'zod'
import { fromKvIterator, getKvPage, KvPageOptions } from './kvLib.ts'

type ModelOptions<
  //
  S extends z.Schema,
  PrimaryKey extends keyof z.input<S>,
  SecondaryKeys extends Exclude<keyof z.input<S>, PrimaryKey>,
> = {
  /** `kv prefix` */
  prefix: string
  primaryKey: PrimaryKey
  /** @default 'ulid'  */
  primaryKeyType?: 'ulid' | (() => z.input<S>[PrimaryKey])
  secondaryKeys: SecondaryKeys[] | Exclude<keyof z.input<S>, PrimaryKey>[]
  indexOptions?: {
    [K in SecondaryKeys]?: {
      /** @default 'one'  */
      relation?: 'one' | 'many'
      transform?: (val: NonNullable<z.input<S>[K]>) => NonNullable<z.input<S>[K]>
    }
  }
  /** @default 'kebab-case' */
  indexNameStyle?: 'kebab-case' | 'camelCase' | 'snake_case'
}

type CreateOptions<Key> = {
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

type UpdateOptions = Omit<CreateOptions<never>, 'key'>
type RemoveOptions = Pick<CreateOptions<never>, 'op' | 'transaction'>

type EmptySchema = z.ZodObject<{}, 'strip', z.ZodTypeAny, {}, {}>

export const createModel = <
  S extends z.Schema,
  PrimaryKey extends keyof z.input<S>,
  // keys without primaryKey
  SecondaryKeys extends Exclude<keyof z.input<S>, PrimaryKey>,
>(
  kv: Deno.Kv,
  schema: S,
  modelOptions: ModelOptions<S, PrimaryKey, SecondaryKeys>,
) => {
  type Input = z.input<S>
  type InputWithoutKey = Omit<Input, PrimaryKey>
  type PrimaryKeyType = Input[PrimaryKey]
  type Output = z.output<S>

  // Default options
  let generateKey = ulid
  if (modelOptions.primaryKeyType === 'ulid') {
    modelOptions.primaryKeyType = ulid
  } else if (typeof modelOptions.primaryKeyType === 'function') {
    generateKey = modelOptions.primaryKeyType
  }

  const _makeIndexKey = (key: Deno.KvKeyPart): Deno.KvKeyPart => {
    switch (modelOptions.indexNameStyle) {
      case 'camelCase':
        return `${modelOptions.prefix as string}${(key as string)[0].toUpperCase()}${(key as string).slice(1)}`
      case 'snake_case':
        return `${modelOptions.prefix as string}_${key as string}`
      case 'kebab-case':
      default:
        return `${modelOptions.prefix as string}-${key as string}`
    }
  }

  type _UpdateIndex = {
    (
      action: 'create',
      op: Deno.AtomicOperation,
      options: {
        expireIn?: number
        force?: boolean
      },
      output: Output,
    ): void
    (
      action: 'update',
      op: Deno.AtomicOperation,
      options: {
        expireIn?: number
        force?: boolean
      },
      output: Output,
      currentValue: Output,
    ): void
    (
      action: 'remove',
      op: Deno.AtomicOperation,
      options: {
        expireIn?: number
        force?: boolean
      },
      output: Output,
    ): void
  }

  const _updateIndex: _UpdateIndex = (action, op, options, output, currentValue?: any) => {
    for (const index of modelOptions.secondaryKeys as SecondaryKeys[]) {
      // skip optional index
      if (action === 'create' && !output[index]) continue
      if (action === 'update') {
        // if (!currentValue[index] /* prev */) continue
        // skip unchanged index
        if (output[index] === currentValue[index]) continue
      }

      let newValue = output[index]
      let prevValue = currentValue?.[index]

      // apply transform
      const indexOptions = modelOptions?.indexOptions?.[index] ?? {}
      if (indexOptions.transform) {
        newValue = indexOptions.transform(newValue)
        if (action === 'update') {
          prevValue = indexOptions.transform(prevValue)
        }
      }

      const primaryId = output[modelOptions.primaryKey]

      // index relation
      indexOptions.relation ??= 'one'
      if (indexOptions.relation === 'one') {
        if (action === 'update') {
          op.delete([_makeIndexKey(index), prevValue])
        }
        const newSecondaryKey = [_makeIndexKey(index), newValue]
        if (action !== 'remove') {
          op.set(newSecondaryKey, primaryId, options)
          if (!options?.force) {
            op.check({key: newSecondaryKey, versionstamp: null})
          }
        } else {
          op.delete(newSecondaryKey)
        }
      } else if (indexOptions.relation === 'many') {
        if (action === 'update') {
          op.delete([_makeIndexKey(index), prevValue, currentValue[modelOptions.primaryKey]])
        }
        const newSecondaryKey = [_makeIndexKey(index), newValue, primaryId]
        if (action !== 'remove') {
          op.set(newSecondaryKey, null, options)
          if (!options?.force) {
            op.check({key: newSecondaryKey, versionstamp: null})
          }
        } else {
          op.delete(newSecondaryKey)
        }
      }
    }
  }

  // Create
  // TODO: delete preview index for 'force' mode
  const create = async (input: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>) => {
    const key = options?.key ?? generateKey()
    const output = schema.parse({
      [modelOptions.primaryKey]: key,
      ...input,
    }) as Output
    const op = options?.op ?? kv.atomic()

    op.set([modelOptions.prefix, key], output, options) // primary

    // update index
    _updateIndex('create', op, options ?? {}, output)

    if (options?.transaction) return output

    const res = await op.commit()
    if (!res.ok) {
      console.error(`%c[KV/Create]`, 'color: green', 'Error')
      throw new Error('Commit failed', {cause: 'duplicate detected'})
    }

    return output
  }

  // Find
  const find = async (key: PrimaryKeyType) => {
    const res = await kv.get<Output>([modelOptions.prefix, key])
    return res.value
  }

  type FindManyOptions = KvPageOptions<PrimaryKeyType>

  const findMany = async (options: FindManyOptions) => {
    const kvPage = await getKvPage<Output, PrimaryKeyType>(kv, [modelOptions.prefix], options)
    return kvPage.map((v) => v.value)
  }

  type FindByIndex = {
    // Resolve `object`
    <T extends SecondaryKeys>(indexKey: T, value: Output[T], options: {resolve: true}): Promise<Output>
    // Get object `primary key`
    <T extends SecondaryKeys>(indexKey: T, value: Output[T], options?: {resolve?: false}): Promise<Output[T]>
  }

  const findByIndex: FindByIndex = async (indexKey, value, options) => {
    // apply transform
    const indexOptions = modelOptions?.indexOptions?.[indexKey] ?? {}
    if (indexOptions.transform) value = indexOptions.transform(value)

    const prefix = _makeIndexKey(indexKey)
    const key = [prefix, value] // 'user-username' 'index'

    if (indexOptions?.relation === 'many') {
      throw new Error("findByIndex not available for relation 'many'. Use findManyByIndex")
    }

    const indexRes = await kv.get<Output[SecondaryKeys]>(key)
    if (!indexRes.value) throw new Error(`Index "${key}" is undefined`)

    return options?.resolve ? find(indexRes.value) : indexRes.value
  }

  type FindManyByIndex = {
    // Resolve `object[]`
    <T extends SecondaryKeys>(
      indexKey: T,
      value: Output[T],
      options: {resolve: true} & KvPageOptions<PrimaryKeyType>,
    ): Promise<Output[]>
    // Get object[] `primary key`
    <T extends SecondaryKeys>(
      indexKey: T,
      value: Output[T],
      options?: {resolve?: false} & KvPageOptions<PrimaryKeyType>,
    ): Promise<Output[T][]>
  }

  const findManyByIndex: FindManyByIndex = async (indexKey, value, options) => {
    // apply transform
    const indexOptions = modelOptions?.indexOptions?.[indexKey] ?? {}
    if (indexOptions.transform) value = indexOptions.transform(value)

    const prefix = _makeIndexKey(indexKey)
    const key = [prefix, value] // 'user-username' 'index'

    const kvPage = await getKvPage<PrimaryKeyType, PrimaryKeyType>(kv, key, options)
    const ids = kvPage.map((v) => v.key.at(-1)!)

    if (indexOptions?.relation !== 'many') {
      throw new Error("findManyByIndex not available for relation 'one'. Use findByIndex")
    }

    if (options?.resolve) {
      const res = await Promise.all(
        chunk(ids, 10).map((ids) => {
          return kv.getMany<Output[]>(
            ids.map((id) => {
              return [modelOptions.prefix, id]
            }),
          )
        }),
      )

      return res
        .flat()
        .filter((v) => v.versionstamp)
        .map((v) => v.value)
    }

    return ids
  }

  // Update
  type UpdateNewValue =
    | Partial<InputWithoutKey>
    | ((currentValue: Output) => Partial<InputWithoutKey> | Promise<Partial<InputWithoutKey>>)

  const updateSchema = (schema as any as EmptySchema)
    .omit({
      [modelOptions.primaryKey]: true,
    } as Output)
    .partial()

  // common
  const _update = async (currentValue: Output, newValue: UpdateNewValue, options?: UpdateOptions) => {
    const value = typeof newValue === 'function' ? await newValue(currentValue) : newValue

    // new value
    // TODO: use deepMerge
    const output = {
      [modelOptions.primaryKey]: currentValue[modelOptions.primaryKey],
      ...updateSchema.parse({
        ...currentValue,
        ...value,
      }),
    } as Output

    const key = currentValue[modelOptions.primaryKey]
    const op = options?.op ?? kv.atomic()

    op.set([modelOptions.prefix, key], output, options) // primary

    // update index
    _updateIndex('update', op, options ?? {}, output, currentValue)

    if (options?.transaction) return output

    const res = await op.commit()
    if (!res.ok) {
      console.error(`%c[KV/Update]`, 'color: green', 'Error')
      throw new Error('Commit failed', {cause: 'duplicate detected'})
    }

    return output
  }

  const update = async (key: PrimaryKeyType, newValue: UpdateNewValue, options?: UpdateOptions) => {
    const currentValue = await find(key)
    if (!currentValue) throw new Error('Resolve by primary key failed')

    return _update(currentValue, newValue, options)
  }

  const updateByIndex = async <T extends SecondaryKeys>(
    indexKey: T,
    indexVal: Output[T],
    newValue: UpdateNewValue,
    options?: UpdateOptions,
  ): Promise<Output> => {
    const currentValue = await findByIndex(indexKey, indexVal, {resolve: true})

    return _update(currentValue, newValue, options)
  }

  const remove = async (key: PrimaryKeyType, options?: RemoveOptions) => {
    const currentValue = await find(key)
    if (!currentValue) throw new Error('Resolve by primary key failed')

    const op = options?.op ?? kv.atomic()

    op.delete([modelOptions.prefix, key]) // primary

    // delete index
    _updateIndex('remove', op, {}, currentValue)

    if (options?.transaction) return

    const res = await op.commit()
    if (!res.ok) {
      console.error(`%c[KV/Remove]`, 'color: green', 'Error')
      throw new Error('Commit failed', {cause: 'duplicate detected'})
    }

    return res.ok
  }

  const removeByIndex = async <T extends SecondaryKeys>(indexKey: T, indexVal: Output[T], options?: RemoveOptions) => {
    const currentValue = await findByIndex(indexKey, indexVal, {resolve: true})

    return remove(currentValue[modelOptions.primaryKey], options)
  }

  // Index
  const wipeIndex = async (keys?: SecondaryKeys[]) => {
    for (const index of keys ?? (modelOptions.secondaryKeys as SecondaryKeys[])) {
      const iter = kv.list({prefix: [_makeIndexKey(index)]})
      for (const item of await fromKvIterator(iter, {limit: 0})) {
        await kv.delete(item.key)
      }
    }
  }

  const indexCreate = async () => {
    const iter = kv.list({prefix: [modelOptions.prefix]})
    for (const item of await fromKvIterator(iter, {limit: 0})) {
      const op = kv.atomic()
      _updateIndex('create', op, {}, item.value)
      await op.commit()
    }
  }

  return {
    kv,
    schema,
    options: modelOptions,
    atomics: () => kv.atomic(),
    create,
    find,
    findMany,
    findByIndex,
    findManyByIndex,
    update,
    updateByIndex,
    remove,
    removeByIndex,
    wipeIndex,
    indexCreate,
  }
}
