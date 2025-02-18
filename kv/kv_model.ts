import type {StandardSchemaV1} from '@standard-schema/spec'
import {chunk} from '@std/collections'
import {ulid} from '@std/ulid/ulid'
import {standardValidate} from '../_utils/standardValidate.ts'
import {type KvPageOptions, getKvPage} from './kv_helper.ts'

type Array2Union<T> = T extends Array<infer O> ? O : T

type GetPrimitiveKey<TObject> = {
  [K in keyof TObject as TObject[K] extends Deno.KvKeyPart
    ? undefined extends TObject[K]
      ? never
      : K
    : never]: TObject[K]
}

type PrimaryKeyType = 'ulid' | 'uuid4' | (() => string)

export type ModelOptions<
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
    key: (value: Output) => Deno.KvKeyPart | Deno.KvKeyPart[]
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

type CreateOptions<Key> = {
  /** Set `Primary` key */
  key?: Key
  /** expireIn in `milliseconds` */
  expireIn?: number
  /**
   * Check `index` before rewriting. Set `true` for overwrite index
   * @default false
   * */
  force?: boolean
  /** override `AtomicOperation` for one transaction */
  op?: Deno.AtomicOperation
  /** @default false - Prevents saves. To combine into one transaction */
  transaction?: boolean
}

type TransactionOption = {
  /** override `AtomicOperation` for one transaction */
  op: Deno.AtomicOperation
  /** Prevents saves. To combine into one transaction */
  transaction: true
}

const compareArrays = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((el, index) => el === b[index])

/**
 *
 * Allows you to create a {@linkcode kvModel} for {@linkcode Deno.Kv} using your favorite validation library that supports the
 * {@link https://github.com/standard-schema/standard-schema#what-schema-libraries-implement-the-spec Standard schema}
 *
 * @example
 * ```ts
 * import {z} from 'zod'
 * import {kvModel} from '@maks11060/kv'
 *
 * const kv = await Deno.openKv()
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   username: z.string(),
 *   flags: z.array(z.string()),
 * })
 *
 * const userModel = kvModel(kv, userSchema, {
 *   prefix: 'user',
 *   primaryKey: 'id',
 *   index: {
 *     username: {
 *       relation: 'one',
 *       key: (user) => user.username.toLowerCase(),
 *     },
 *     role: {
 *       relation: 'many',
 *       key: (user) => user.flags,
 *     },
 *   },
 * })
 * ```
 */
export const kvModel = <
  Schema extends StandardSchemaV1, //
  Options extends ModelOptions<Schema, string>
>(
  kv: Deno.Kv,
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
  type Create = {
    /**
     * Create transaction
     * @example
     * ```ts
     * const op = userModel.atomic()
     *
     * const user2 = userModel.create({username: 'user2', flags: ['user']}, {op, transaction: true})
     * const user3 = await userModel.create({username: 'user3', flags: ['user']}, {op})
     * ```
     */
    (input: InputWithoutKey, options: CreateOptions<PrimaryKeyType> & TransactionOption): Output
    /**
     * Create one record
     * @example
     * ```ts
     * const user1 = userModel.create({username: 'user1', flags: ['user']})
     * ```
     */
    (input: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>): Promise<Output>
  }

  const create: Create = (input: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>): any => {
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
      const _secondaryKey = indexOption.key(output) // indexVal

      for (const secondaryKey of Array.isArray(_secondaryKey) ? _secondaryKey : [_secondaryKey]) {
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
    }

    return options?.transaction ? output : _commit(op, output, 'create')
  }

  // FIND
  /**
   * Find object by primary key
   *
   * @example
   * ```ts
   * const user = await userModel.find('user1')
   * // {id: "01JMBM2B8EAQS0JNH44GT1TYEK", username: "user1", flags: ["user"]}
   * ```
   */
  const find = async (key: PrimaryKeyType) => {
    const _key = [modelOptions.prefix, key] as Deno.KvKey
    const res = await kv.get<Output>(_key)
    return res.value
  }

  /**
   * Find many objects by primary key
   *
   * @example
   * ```ts
   * const users = await userModel.findMany({})
   * // [ {id: "01JMBM2B8EAQS0JNH44GT1TYEK", username: "user1", flags: ["user"]} ]
   * ```
   */
  const findMany = async (options: KvPageOptions<PrimaryKeyType>) => {
    const kvPage = await getKvPage<Output, PrimaryKeyType>(kv, [modelOptions.prefix], options)
    return kvPage.values()
  }

  // FIND by index
  type FindResolve = {resolve: true}
  type FindNoResolve = {resolve?: false}
  type FindByIndex = {
    // Find primary keys
    /**
     * Relation `one`
     * @example
     * ```ts
     * const userId = await userModel.findByIndex('username', 'user1')
     * // 01JMBH8DSKHC48VWE2VXMMRQNP
     * ```
     *
     * Relation `many`
     * @example
     * ```ts
     * const userIds = await userModel.findByIndex('role', 'user')
     * // [ "01JMBH8DSKHC48VWE2VXMMRQNP" ]
     * ```
     */
    <Key extends IndexKey>(
      key: Key,
      value: Array2Union<IndexMap[Key]['key']>,
      options?: ChoiceOption<
        IndexMap[Key]['type'], //
        FindNoResolve,
        FindNoResolve & KvPageOptions<PrimaryKeyType>
      >
    ): Promise<
      ChoiceOption<
        IndexMap[Key]['type'], //
        PrimaryKeyType | null, //
        PrimaryKeyType[]
      >
    >
    // Find and resolve primary object
    /**
     * Relation `one`
     * @example
     * ```ts
     * const user = await userModel.findByIndex('username', 'user1', {resolve: true})
     * // {id: "01JMBH8DSKHC48VWE2VXMMRQNP", username: "user1", flags: [ "user" ]}
     * ```
     *
     * Relation `many`
     * @example
     * ```ts
     * const users = await userModel.findByIndex('role', 'user', {resolve: true})
     * // [ {id: "01JMBH8DSKHC48VWE2VXMMRQNP", username: "user1", flags: [ "user" ]} ]
     * ```
     */
    <Key extends IndexKey>(
      key: Key,
      value: Array2Union<IndexMap[Key]['key']>,
      options: ChoiceOption<
        IndexMap[Key]['type'], //
        FindResolve,
        FindResolve & KvPageOptions<PrimaryKeyType>
      >
    ): Promise<
      ChoiceOption<
        IndexMap[Key]['type'], //
        Output,
        Output[]
      >
    >
  }

  // TODO: add cache for resolver
  const findByIndex: FindByIndex = async (indexKey: string, secondaryKey, options): Promise<any> => {
    const indexOption = modelOptions.index[indexKey]
    // const indexKey = key
    // const secondaryKey = value

    if (!indexOption.relation || indexOption.relation === 'one') {
      const key = [_prefixKey(indexKey), secondaryKey] // ['prefix-indexKey', 'indexVal']
      const indexRes = await kv.get<PrimaryKeyType>(key)
      // if (!indexRes.value) throw new Error(`[KV|findByIndex] index: ${key} is undefined`)
      if (!indexRes.value) return indexRes.value
      return options?.resolve ? find(indexRes.value) : indexRes.value
    } else if (indexOption.relation === 'many') {
      const key = [_prefixKey(indexKey), secondaryKey]
      const kvPage = await getKvPage<PrimaryKeyType, PrimaryKeyType>(kv, key, options as KvPageOptions<PrimaryKeyType>)

      if (options?.resolve) {
        // kvPage[30] => kvPage[10][3] => kvPage.map(page.key => [prefix, primaryKey]) => kv.getMany()
        const res = await Promise.all(
          chunk(await kvPage.kvEntries(), 10).map((page) => {
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
      // return kvPage.map((v) => v.key.at(-1)! /* primaryKey */)
      return (await kvPage.keys()).map((v) => v.at(-1)! /* primaryKey */)
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
      const _secondaryKey = indexOption.key(newValue) // indexVal
      const _prevSecondaryKey = indexOption.key(curValue /* value */) // prev indexVal

      // skip unchanged index
      if (_secondaryKey === _prevSecondaryKey) continue
      // TODO: improve duplicate detection. ['a', 'b'] === ['b', 'a']
      if (Array.isArray(_secondaryKey) && Array.isArray(_prevSecondaryKey)) {
        if (compareArrays(_secondaryKey, _prevSecondaryKey)) continue
      }

      // TODO: Test u8array as index

      const secondaryKeys = Array.isArray(_secondaryKey) ? _secondaryKey : [_secondaryKey]
      const prevSecondaryKeys = (Array.isArray(_prevSecondaryKey) ? _prevSecondaryKey : [_prevSecondaryKey]).filter(
        (v) => !secondaryKeys.includes(v)
      )

      // delete prev index
      for (const curValue of prevSecondaryKeys) {
        if (!indexOption.relation || indexOption.relation === 'one') {
          const prevKey = [_prefixKey(indexKey), curValue]
          op.delete(prevKey)
        } else if (indexOption.relation === 'many') {
          const prevKey = [_prefixKey(indexKey), curValue, primaryKey as Deno.KvKeyPart]
          op.delete(prevKey)
        }
      }

      // create new index
      for (const secondaryKey of secondaryKeys) {
        if (!indexOption.relation || indexOption.relation === 'one') {
          const key = [_prefixKey(indexKey), secondaryKey] // ['prefix-indexKey', 'indexVal']
          op.set(key, primaryKey, options) // key => primaryKey
          if (!options?.force) op.check({key, versionstamp: null})
        } else if (indexOption.relation === 'many') {
          const key = [_prefixKey(indexKey), secondaryKey, primaryKey as Deno.KvKeyPart] // ['prefix-indexKey', 'indexVal', 'primaryKey']
          op.set(key, null, options) // key => null
          if (!options?.force) op.check({key, versionstamp: null})
        }
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
      const _secondaryKey = indexOption.key(value) // indexVal

      for (const secondaryKey of Array.isArray(_secondaryKey) ? _secondaryKey : [_secondaryKey]) {
        if (!indexOption.relation || indexOption.relation === 'one') {
          const key = [_prefixKey(indexKey), secondaryKey] // ['prefix-indexKey', 'indexVal']
          op.delete(key)
        } else if (indexOption.relation === 'many') {
          const key = [_prefixKey(indexKey), secondaryKey, primaryKey as Deno.KvKeyPart] // ['prefix-indexKey', 'indexVal', 'primaryKey']
          op.delete(key)
        }
      }
    }

    return options?.transaction ? true : _commit(op, true, 'remove')
  }

  const removeByIndex = async <Key extends IndexKey>(
    key: Key,
    value: Array2Union<IndexMap[Key]['key']>,
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

  const index = {
    wipe: async (key?: IndexKey) => {
      for (const indexKey in modelOptions.index) {
        const iter = kv.list({prefix: [_prefixKey(indexKey)]})
        for await (const item of iter) {
          if (key) {
            if (_prefixKey(key as string) === item.key.at(0)) {
              await kv.delete(item.key)
            }
          } else {
            await kv.delete(item.key)
          }
        }
      }
    },
    create: async (options?: CreateOptions<PrimaryKeyType>) => {
      const iter = kv.list<Output>({prefix: [modelOptions.prefix]})
      for await (const {value} of iter) {
        const op = options?.op ?? kv.atomic()
        const primaryKey = value[modelOptions.primaryKey] as Deno.KvKeyPart // primaryKey

        // index
        for (const indexKey in modelOptions.index) {
          const indexOption = modelOptions.index[indexKey]
          const _secondaryKey = indexOption.key(value) // indexVal

          for (const secondaryKey of Array.isArray(_secondaryKey) ? _secondaryKey : [_secondaryKey]) {
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
        }

        await _commit(op, null, 'index-create')
      }
    },
  }

  return {
    index,
    atomic: () => kv.atomic(),
    create,
    find,
    findMany,
    findByIndex,
    update,
    remove,
    removeByIndex,
  }
}
