import { getKvPage, KvPageOptions } from '@maks11060/kv/helper'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { chunk } from '@std/collections/chunk'
import { intersect } from '@std/collections/intersect'
import {  } from '@std/collections'
import { ulid } from '@std/ulid'
import { generate as randomUUID7 } from '@std/uuid/unstable-v7'
import { equal } from 'jsr:@std/assert/equal'
import { expect } from 'jsr:@std/expect/expect'
import { z } from 'zod/v4'
import { standardValidate } from './_standardValidate.ts'

type OmitOptionalFields<TObject> = {
  [
    K in keyof TObject as //
    TObject[K] extends Deno.KvKeyPart //
      ? TObject[K] extends undefined ? never
      : K
      : never
  ]: TObject[K]
}

// type DefaultSchema = {}
type DefaultSchema = Record<PropertyKey, unknown>

// Index
type ExtractArray<T> = T extends Array<infer O> ? O : T
interface Index<T = unknown> {
  relation?: 'one' | 'many'
  /** */
  key(v: T): Deno.KvKeyPart | null | undefined | void | (Deno.KvKeyPart | null | undefined | void)[]
}
type IndexKeyof<T> = T extends { [K in infer O]: Index } ? O : never
type IndexRelation<T, K extends PropertyKey> = T extends { [k in K]: {relation: infer O} } ? O
  : unknown
type IndexReturnType<T, K extends PropertyKey> = T extends {
  [k in K]: {key(...args: unknown[]): infer O}
} ? ExtractArray<O> | null | undefined | void // allow empty value
  : unknown

// KvModel Methods
type TransactionOption = {
  /** override `AtomicOperation` for one transaction */
  op: Deno.AtomicOperation
  /** Prevents saves. To combine into one transaction */
  transaction: true
}

type CreateOptions<Key = unknown> = {
  /** Set `Primary` key */
  key?: Key
  /** expireIn in `milliseconds` */
  expireIn?: number
  /**
   * Check `index` before rewriting. Set `true` for overwrite index
   * @default false
   */
  force?: boolean
  /** override `AtomicOperation` for one transaction */
  op?: Deno.AtomicOperation
  /** @default false - Prevents saves. To combine into one transaction */
  transaction?: boolean
}

type UpdateOptions = Omit<CreateOptions, 'key'>

type RemoveOptions = Pick<CreateOptions, 'op' | 'transaction'>

interface KvModel<
  Schema extends StandardSchemaV1<DefaultSchema>,
  PrimaryKey,
  Index,
  // local
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  InputWithoutPrimaryKey = Omit<Input, PrimaryKey extends keyof Input ? PrimaryKey : never>,
  InputPrimaryKeyType = Input[PrimaryKey extends keyof Input ? PrimaryKey : never],
  OutputPrimaryKeyType = Output[PrimaryKey extends keyof Output ? PrimaryKey : never],
> {
  /**
   * Start `transaction`
   */
  atomic(): Deno.AtomicOperation

  /**
   * Commit the `transaction`
   */
  commit(op: Deno.AtomicOperation): Promise<void>

  /**
   * Create `record`
   */
  create(data: InputWithoutPrimaryKey, options?: CreateOptions<InputPrimaryKeyType>): Promise<Output>
  /**
   * Transaction
   */
  create(data: InputWithoutPrimaryKey, options: CreateOptions<InputPrimaryKeyType> & TransactionOption): Output

  /**
   * Find object by `PrimaryKey`
   * @example
   * ```ts
   * const user = await userModel.find('1')
   * // {id: '1', username: 'user1'}
   * ```
   */
  find(key: OutputPrimaryKeyType): Promise<Output | null>

  /**
   * Find many objects by `PrimaryKey`
   * @example
   * ```ts
   * const users = await userModel.findMany() // get first `50` records
   * users // [ {id: '1', username: 'user1'}, {id: '2', username: 'user2'} ]
   * ```
   *
   * Pagination
   * @example
   * ```ts
   * await model.create({username: 'user1', age: 18})
   * await model.create({username: 'user2', age: 18})
   * await model.create({username: 'user3', age: 17})
   * await model.create({username: 'user4', age: 19})
   * await model.create({username: 'user5', age: 10})
   *
   * const userList1 = await userModel.findMany({limit: 2})
   * userList1 // [ {id: '1', username: 'user1', age: 18}, {id: '2', username: 'user2', age: 18} ]
   *
   * const lastId = userList1.at(-1)?.id! // '2'
   * const userList2 = await userModel.findMany({limit: 2, offset: lastId})
   * userList2 // [ {id: '3', username: 'user3', age: 17}, {id: '4', username: 'user4', age: 19} ]
   * ```
   */
  findMany(options?: KvPageOptions<OutputPrimaryKeyType>): Promise<Output[]>

  /**
   * Find the `primary keys` by the `index`
   *
   * Relation `one`
   * @example
   * ```ts
   * const userId = await userModel.findByIndex('username', 'user1')
   * userId // '1'
   * ```
   *
   * Relation `many`
   * @example
   * ```ts
   * const userIds = await userModel.findByIndex('age', 18)
   * userIds // [ '1', '2' ]
   * ```
   */
  findByIndex<Key extends IndexKeyof<Index>>(
    key: Key,
    val: IndexReturnType<Index, Key>,
    options?: {resolve?: false},
  ): IndexRelation<Index, Key> extends 'many' //
    ? Promise<OutputPrimaryKeyType[]>
    : Promise<OutputPrimaryKeyType | null>

  /**
   * Find by `index` and `resolve` object
   *
   * Relation `one`
   * @example
   * ```ts
   * const user = await userModel.findByIndex('username', 'user1', {resolve: true})
   * user // {id: '1', username: 'user1', age: 18}
   * ```
   *
   * Relation `many`
   * @example
   * ```ts
   * const users = await userModel.findByIndex('role', 'user', {resolve: true})
   * users // [ {id: '1', username: 'user1', age: 18}, {id: '2', username: 'user2', age: 18} ]
   * ```
   */
  findByIndex<Key extends IndexKeyof<Index>>(
    key: Key,
    val: IndexReturnType<Index, Key>,
    options: {resolve: true},
  ): IndexRelation<Index, Key> extends 'many' //
    ? Promise<Output[]>
    : Promise<Output | null>

  /**
   * Merge the current object with the new object
   * @example
   * ```ts
   * const user = await userModel.create({username: 'user1', age: 18})
   * user // {id: '1', username: 'user1', age: 18}
   *
   * const update = await userModel.update(user.id, {age: 19})
   * updata // {id: '1', username: 'user1', age: 19}
   * ```
   */
  update(
    key: InputPrimaryKeyType,
    input: Partial<InputWithoutPrimaryKey>,
    options?: UpdateOptions,
  ): Promise<Output>

  /**
   * Update current object using callback
   * @example
   * ```ts
   * const user = await userModel.create({username: 'user1', age: 18})
   * user // {id: '1', username: 'user1', age: 18}
   *
   * const update = await userModel.update(user.id, (v) => {
   *   v.age = 20
   * })
   * update // {id: '1', username: 'user1', age: 20}
   * ```
   */
  update(
    key: InputPrimaryKeyType,
    handler: (val: Output) => Promise<Partial<InputWithoutPrimaryKey> | void> | Partial<InputWithoutPrimaryKey> | void,
    options?: UpdateOptions,
  ): Promise<Output>

  remove(key: InputPrimaryKeyType, options: TransactionOption): void
  remove(key: InputPrimaryKeyType, options?: RemoveOptions): Promise<boolean>

  // removeByIndex<Key extends IndexKeyof<Options>>(
  //   key: Key,
  //   val: IndexReturnType<Options, Key>,
  //   options?: {resolve?: false},
  // ): IndexRelation<Options, Key> extends 'many' //
  //   ? Promise<PrimaryKeyType[]>
  //   : Promise<PrimaryKeyType | null>

  // removeByIndex<Key extends IndexKeyof<Options>>(
  //   key: Key,
  //   val: IndexReturnType<Options, Key>,
  //   options: TransactionOption
  // ): IndexRelation<Options, Key> extends 'many' //
  //   ? Promise<Output[]>
  //   : Promise<Output | null>
}

interface KvModelContext {
  kv: Parameters<typeof createModel>['0']
  schema: Parameters<typeof createModel>['1']
  options: Parameters<typeof createModel>['2']
}

const createModel = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  // local
  const RequiredInput = OmitOptionalFields<Input>,
  const PrimaryKey extends PropertyKey = keyof RequiredInput,
  TIndex extends {[k: string]: Index<Output>} = {[k: string]: Index<Output>},
>(
  kv: Deno.Kv,
  /**
   * Any schema library that supports {@link https://github.com/standard-schema/standard-schema Standard Schema}
   */
  schema: Schema,
  /**
   * Model options
   */
  options: {
    /**
     * A unique name for the {@linkcode KvModel}
     *
     * @example
     * ```ts
     * // In KV
     * kv.set([PREFIX, 'PRIMARY_KEY'], PAYLOAD)
     * // Index
     * kv.set([`${PREFIX}-${INDEX_NAME}`, SECONDARY_KEY], PRIMARY_KEY) //       relation === one
     * kv.set([`${PREFIX}-${INDEX_NAME}`, SECONDARY_KEY, PRIMARY_KEY], null) // relation === many
     * ```
     */
    prefix: string

    /**
     * Available types for `primaryKey`:
     * 1. {@linkcode Uint8Array}
     * 2. {@linkcode String}
     * 3. {@linkcode Number}
     * 4. {@linkcode BigInt}
     * 5. {@linkcode Boolean}
     */
    primaryKey: PrimaryKey

    /**
     * Configuring the primary key generator. You can also specify the primary key in the {@linkcode KvModel.create} method
     * - `ulid`  - `timestamp` + `rand`
     * - `uuid4` - {@linkcode crypto.randomUUID}
     * - `uuid7` - `timestamp` + `rand`
     * - `() => '1'`
     *
     * @default ulid
     */
    primaryKeyType?:
      | 'ulid'
      | 'uuid4'
      | 'uuid7'
      | (() => RequiredInput[PrimaryKey extends keyof RequiredInput ? PrimaryKey : never])

    /**
     * Setting up the `index`. you need to create an arbitrary `index` name and link the data
     *
     * @example
     * ```ts
     * {
     *   username: {
     *     key: (user) => user.username.toLowerCase()
     *   },
     * }
     * ```
     */
    index?: TIndex
  },
): KvModel<Schema, PrimaryKey, TIndex> => {
  const model: KvModelContext = {kv, schema, options: options as any}

  return {
    atomic() {
      return kv.atomic()
    },

    commit(op) {
      return _commit(model, op, undefined, 'commit')
    },

    create(data, options) {
      return _create(model, data, options) as any
    },

    find(key) {
      return _find(model, key as any) as any
    },

    findMany(options = {}) {
      return _findMany(model, options as any) as any
    },

    findByIndex(key, val, options) {
      return _findByIndex(model, key as string, val as any, options) as any
    },

    update() {},

    remove() {},
  }
}

const generateKey = (type: KvModelContext['options']['primaryKeyType'] = 'ulid') => {
  if (type === 'ulid') {
    return ulid()
  } else if (type === 'uuid4') {
    return crypto.randomUUID()
  } else if (type === 'uuid7') {
    return randomUUID7()
  } else if (typeof type === 'function') {
    return type()
  }
  throw new Error('Generate Key error')
}

const _commit = async <T>(model: KvModelContext, op: Deno.AtomicOperation, val: T, action: string) => {
  const res = await op.commit()
  if (!res.ok) {
    console.error(`%c[KV|${action}|${model.options.prefix}]`, 'color: green', 'Error')
    throw new Error('Commit failed', {cause: `duplicate detected. Try with 'force' options`})
  }

  return val as T
}

const _indexCreate = (
  model: KvModelContext,
  op: Deno.AtomicOperation,
  index: Index,
  indexKey: string,
  primaryKey: Deno.KvKeyPart,
  secondaryKey: Deno.KvKeyPart,
  options?: {expireIn?: number; force?: boolean},
) => {
  if (!index.relation || index.relation === 'one') {
    const key = [`${model.options.prefix}-${indexKey}`, secondaryKey]
    op.set(key, primaryKey, options)
  } else if (index.relation === 'many') {
    const key = [`${model.options.prefix}-${indexKey}`, secondaryKey, primaryKey]
    op.set(key, null, options)
    if (!options?.force) op.check({key, versionstamp: null})
  }
}

const _indexRemove = (
  model: KvModelContext,
  op: Deno.AtomicOperation,
  index: Index,
  indexKey: string,
  primaryKey: Deno.KvKeyPart,
  secondaryKey: Deno.KvKeyPart,
) => {
  if (!index.relation || index.relation === 'one') {
    const key = [`${model.options.prefix}-${indexKey}`, secondaryKey]
    op.delete(key)
  } else if (index.relation === 'many') {
    const key = [`${model.options.prefix}-${indexKey}`, secondaryKey, primaryKey]
    op.delete(key)
  }
}

const _create = (model: KvModelContext, data: {}, options?: CreateOptions) => {
  const key = options?.key ?? generateKey(model.options.primaryKeyType)
  const op = options?.op ?? model.kv.atomic()

  const output = standardValidate(model.schema, {
    ...data,
    [model.options.primaryKey]: key,
  })

  // primary
  const primaryKey = output[model.options.primaryKey] as Deno.KvKeyPart
  op.set([model.options.prefix, primaryKey], output, options)

  // index
  for (const indexKey in model.options.index) {
    const index = model.options.index[indexKey]
    const secondaryKey = index.key(output)

    const secondaryKeys = Array.isArray(secondaryKey) ? secondaryKey : [secondaryKey]
    for (const secondaryKey of secondaryKeys) {
      if (secondaryKey === null || secondaryKey === undefined) continue // skip nullish
      _indexCreate(model, op, index, indexKey, primaryKey, secondaryKey, options)
    }
  }

  return options?.transaction ? output : _commit(model, op, output, 'create')
}

const _find = async (model: KvModelContext, primaryKey: Deno.KvKeyPart) => {
  type Output = unknown // TODO: expose

  const _key = [model.options.prefix, primaryKey] as Deno.KvKey
  const res = await model.kv.get<Output>(_key)
  return res.value
}

const _findMany = async (model: KvModelContext, options: KvPageOptions) => {
  type Output = unknown // TODO: expose

  const kvPage = await getKvPage<Output>(model.kv, [model.options.prefix], options)
  return kvPage.values()
}

const _findByIndex = async (
  model: KvModelContext,
  indexKey: string,
  secondaryKey: Deno.KvKeyPart,
  options?: {resolve?: boolean},
) => {
  type Output = unknown // TODO: expose

  if (!model.options.index?.[indexKey]) throw new Error('[KV|findByIndex] Index key not found')
  if (secondaryKey === null || secondaryKey === undefined) return null

  const indexOption = model.options.index[indexKey]
  const key = [`${model.options.prefix}-${indexKey}`, secondaryKey] // ['prefix-indexKey', 'indexVal']

  if (!indexOption.relation || indexOption.relation === 'one') {
    const indexRes = await model.kv.get(key)
    if (!indexRes.value) return indexRes.value
    // if (!indexRes.value) throw new Error(`[KV|findByIndex] index: ${key} is undefined`)
    return options?.resolve ? _find(model, indexRes.value) : indexRes.value
  } else if (indexOption.relation === 'many') {
    const kvPage = await getKvPage(model.kv, key, options as KvPageOptions)
    // const kvPage = await getKvPage<PrimaryKeyType, PrimaryKeyType>(kv, _key, options as KvPageOptions<PrimaryKeyType>)

    if (options?.resolve) {
      // kvPage[30] => kvPage[10][3] => kvPage.map(page.key => [prefix, primaryKey]) => kv.getMany()
      const res = await Promise.all(
        chunk(await kvPage.kvEntries(), 10).map((page) => {
          return model.kv.getMany<Output[]>(
            page.map(({key}) => {
              return [model.options.prefix, key.at(-1)!]
            }),
          )
        }),
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

const _updata = async (
  model: KvModelContext,
  key: Deno.KvKeyPart,
  handlerOrObj: unknown,
  options?: UpdateOptions,
) => {
  const value = await _find(model, key) as Record<PropertyKey, unknown>
  if (!value) return null

  const {[model.options.primaryKey]: primaryKey, ...curValue} = value
  const {[model.options.primaryKey]: _, ..._newValue} = typeof handlerOrObj === 'function'
    ? (await handlerOrObj(value)) ?? value
    : handlerOrObj

  // merge current + new object
  const newValue = standardValidate(model.schema, {
    [model.options.primaryKey]: primaryKey,
    ...curValue,
    ..._newValue,
  })

  // update primary
  const op = options?.op ?? model.kv.atomic()
  op.set([model.options.prefix, primaryKey as Deno.KvKeyPart], newValue, options) // ['prefix', 'primaryKey'] => object

  // partial update index

  for (const indexKey in model.options.index) {
    const index = model.options.index[indexKey]
    const curSecondaryKey = index.key(curValue)
    const newSecondaryKey = index.key(newValue)

    // skip if index equals
    if (equal(curSecondaryKey, newSecondaryKey)) continue

    // delete prev index
    const curSecondaryKeys = Array.isArray(curSecondaryKey) ? curSecondaryKey : [curSecondaryKey] // [age]
    const newSecondaryKeys = Array.isArray(newSecondaryKey) ? newSecondaryKey : [newSecondaryKey] // [age]


    //
    for (const secondaryKey of newSecondaryKeys) {
      // _indexCreate(model, op, newSecondaryKey)
      if (secondaryKey === null || secondaryKey === undefined) continue // skip nullish
      _indexCreate(model, op, index, indexKey, primaryKey as Deno.KvKeyPart, secondaryKey, options)
    }

    // for (const curValue of prevSecondaryKeys) {
    //   if (!indexOption.relation || indexOption.relation === 'one') {
    //     const prevKey = [_prefixKey(indexKey), curValue]
    //     op.delete(prevKey)
    //   } else if (indexOption.relation === 'many') {
    //     const prevKey = [_prefixKey(indexKey), curValue, primaryKey as Deno.KvKeyPart]
    //     op.delete(prevKey)
    //   }
    // }

  }
}

const _remove = async (model: KvModelContext, key: unknown, val: unknown, options?: {resolve?: boolean}) => {}

const _removeByIndex = async (model: KvModelContext, key: unknown, val: unknown, options?: {}) => {}

Deno.test('Test 000000', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const schema = z.object({
    id: z.string(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    index: {},
  })
})

Deno.test('Test 090345', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
    id_str: z.string(),
    id_u8: z.instanceof(Uint8Array),
  })

  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => 1,
  })
  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'username',
    primaryKeyType: () => '', // err
  })
  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id_str',
    primaryKeyType: () => '',
  })
  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id_u8',
    primaryKeyType: () => crypto.getRandomValues(new Uint8Array(16)),
  })
})

Deno.test('Test 737423', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.int(),
    // id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
  })
  const model = createModel(kv, userSchema, {
    prefix: '',
    primaryKey: 'id',
    primaryKeyType: () => 1,
    index: {
      i1: {key: (value) => value.username},
      i2: {key: (value) => 123},
    },
  })

  await model.create({username: ''}, {key: 1})
  await model.create({username: ''}, {key: 1})

  await model.findByIndex('i1', '123')
  await model.findByIndex('i2', 1)

  await model.find(123)
})

Deno.test('Test 163078', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let idCounter = 0

  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
    get friends() {
      return userSchema.array().optional()
    },
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType() {
      return idCounter++
    },
    index: {
      i1: {relation: 'one', key: (v) => v.username},
      i2: {relation: 'one', key: (v) => {}},
      i3: {relation: 'one', key: (v) => Math.random() > .5 ? undefined : v.id},
      i4: {key: (v) => {}},
      i5: {relation: 'many', key: (v) => {}},
      i6: {key: (v) => v.email},
      i7: {relation: 'many', key: (v) => v.friends?.map((v) => v.id)},
    },
  })

  await userModel.create({username: 'abc'}) satisfies z.infer<typeof userSchema>
  await userModel.find(1) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i1', '1') satisfies number | null
  await userModel.findByIndex('i1', '1', {resolve: false}) satisfies number | null
  await userModel.findByIndex('i1', '1', {resolve: true}) satisfies z.infer<typeof userSchema> | null

  await userModel.findByIndex('i2', undefined, {resolve: true}) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i3', 1, {resolve: true}) satisfies z.infer<typeof userSchema> | null

  await userModel.findByIndex('i3', undefined, {resolve: true}) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i3', null, {resolve: true}) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i3', (() => {})(), {resolve: true}) satisfies z.infer<typeof userSchema> | null

  await userModel.findByIndex('i4', null) satisfies number | null
  await userModel.findByIndex('i5', undefined) satisfies number[]
  await userModel.findByIndex('i6', '1') satisfies number | null
  await userModel.findByIndex('i7', 1) satisfies number[] | null
})

Deno.test('Test 163071 create', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
    get friends() {
      return userSchema.array().optional()
    },
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: 'uuid7',
    index: {
      username: {relation: 'one', key: (v) => v.username},
      email: {key: (v) => v.email},
      friends: {relation: 'many', key: (v) => v.friends?.map((v) => v.id)},
    },
  })

  await userModel.create({username: 'abc'}) satisfies z.infer<typeof userSchema>

  const user1 = await userModel.findByIndex('username', 'abc', {resolve: true})
  if (!user1) throw new Error('findByIndex user1 not found')
  expect(user1.id).toBeTruthy()
  expect(user1.email).toBe(null)
  expect(user1.username).toBe('abc')

  const user2 = await userModel.create({
    username: 'user2',
    email: 'user2@example.com',
    friends: [user1],
  })
  const user3 = await userModel.create({
    username: 'user3',
    email: 'user3@example.com',
    friends: [user2, user1],
  })

  // printKV(kv)
})

Deno.test('Test 448353 create(transaction)', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType() {
      return `${id++}`
    },
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.username.toLowerCase()},
    },
  })

  const op = model.atomic()
  for (let i = 0; i < 2; i++) {
    model.create({username: `user${i}`, age: 18}, {op, transaction: true})
  }
  await model.commit(op)

  const list = await model.findMany()
  expect(list).toEqual([
    {id: '1', username: 'user0', age: 18},
    {id: '2', username: 'user1', age: 18},
  ])
})

Deno.test('Test 448354 findMany', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType() {
      return `${id++}`
    },
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.username.toLowerCase()},
    },
  })

  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 17})
  await model.create({username: 'user4', age: 19})
  await model.create({username: 'user5', age: 10})

  // console.log(await model.findMany())
  const userList1 = await model.findMany({limit: 2})

  const lastId = userList1.at(-1)?.id! // '2'
  const userList2 = await model.findMany({limit: 2, offset: lastId})

  const lastId2 = userList2.at(-1)?.id! // '4'
  const userList3 = await model.findMany({limit: 2, offset: lastId2})

  expect(userList1).toEqual([
    {id: '1', username: 'user1', age: 18},
    {id: '2', username: 'user2', age: 18},
  ])
  expect(userList2).toEqual([
    {id: '3', username: 'user3', age: 17},
    {id: '4', username: 'user4', age: 19},
  ])
  expect(userList3).toEqual([
    {id: '5', username: 'user5', age: 10},
  ])

  const userListEmpty = await model.findMany({limit: 2, offset: '5'})
  expect(userListEmpty).toEqual([])
})

Deno.test('Test 453253 update', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType() {
      return `${id++}`
    },
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.username.toLowerCase()},
    },
  })

  //
  const user = await model.create({username: 'user1', age: 18})
  expect(user).toEqual({id: '1', username: 'user1', age: 18})

  const updata1 = await model.update(user.id, {age: 19})
  expect(updata1).toEqual({id: '1', username: 'user1', age: 19})

  const updata2 = await model.update(user.id, (v) => {
    v.age = 20
  })
  expect(updata2).toEqual({id: '1', username: 'user1', age: 20})

  const updata3 = await model.update(user.id, (v) => {
    return {
      age: 21,
    }
  })
  expect(updata3).toEqual({id: '1', username: 'user1', age: 21})
})
