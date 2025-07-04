import { getKvPage, type KvPageOptions } from '@maks11060/kv/helper'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { chunk } from '@std/collections/chunk'
import { ulid } from '@std/ulid/ulid'
import { generate as randomUUID7 } from '@std/uuid/unstable-v7'
import { equal } from 'jsr:@std/assert/equal'
import { expect } from 'jsr:@std/expect/expect'
import { z } from 'zod/v4'
import { standardValidate } from './_standardValidate.ts'

export const Internal = Symbol('Internal')

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

type DeleteOptions = Pick<CreateOptions, 'op' | 'transaction'>

type DeleteByIndexOptions = Pick<CreateOptions, 'op' | 'transaction'>

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
  [Internal]: KvModelContext

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
    options?: {resolve?: false} & KvPageOptions<OutputPrimaryKeyType>,
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
    options: {resolve: true} & KvPageOptions<OutputPrimaryKeyType>,
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

  delete(key: InputPrimaryKeyType, options: TransactionOption): void

  delete(key: InputPrimaryKeyType, options?: DeleteOptions): Promise<boolean>

  deleteByIndex<Key extends IndexKeyof<Index>>(
    key: Key,
    val: IndexReturnType<Index, Key>,
    options?: DeleteByIndexOptions & KvPageOptions<OutputPrimaryKeyType>,
  ): Promise<boolean>
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
    [Internal]: model,

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

    findByIndex(indexKey, secondaryKey, options) {
      return _findByIndex(model, indexKey as string, secondaryKey as Deno.KvKeyPart, options) as any
    },

    update(primaryKey, handlerOrObj, options) {
      return _updata(model, primaryKey as Deno.KvKeyPart, handlerOrObj, options) as any
    },

    delete(primaryKey, options) {
      return _delete(model, primaryKey as Deno.KvKeyPart, options) as any
    },

    deleteByIndex(indexKey, secondaryKey, options) {
      return _deleteByIndex(model, indexKey as string, secondaryKey as Deno.KvKeyPart, options) as any
    },
  }
}

const _generateKey = (type: KvModelContext['options']['primaryKeyType'] = 'ulid') => {
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

const _indexDelete = (
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

const _create = (model: KvModelContext, data: DefaultSchema, options?: CreateOptions) => {
  const key = options?.key ?? _generateKey(model.options.primaryKeyType)
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
  options?: {resolve?: boolean} & KvPageOptions<unknown>,
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
    return options?.resolve ? _find(model, indexRes.value as Deno.KvKeyPart) : indexRes.value
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

  // merge(top-level) current + new object
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
    // console.log({indexKey, curSecondaryKey, newSecondaryKey})

    const curSecondaryKeys = Array.isArray(curSecondaryKey) ? curSecondaryKey : [curSecondaryKey]
    const newSecondaryKeys = Array.isArray(newSecondaryKey) ? newSecondaryKey : [newSecondaryKey]
    // console.log({curSecondaryKeys, newSecondaryKeys})

    // delete current index
    for (const secondaryKey of curSecondaryKeys) {
      if (secondaryKey === null || secondaryKey === undefined) continue // skip nullish
      _indexDelete(model, op, index, indexKey, primaryKey as Deno.KvKeyPart, secondaryKey)
    }

    // create new index
    for (const secondaryKey of newSecondaryKeys) {
      if (secondaryKey === null || secondaryKey === undefined) continue // skip nullish
      _indexCreate(model, op, index, indexKey, primaryKey as Deno.KvKeyPart, secondaryKey, options)
    }
  }

  return options?.transaction ? newValue : _commit(model, op, newValue, 'update')
}

const _delete = async (
  model: KvModelContext,
  key: Deno.KvKeyPart,
  options?: DeleteOptions,
) => {
  const value = await _find(model, key) as Record<PropertyKey, unknown>
  if (!value) return null

  // delete primary
  const op = options?.op ?? model.kv.atomic()
  op.delete([model.options.prefix, key as Deno.KvKeyPart]) // primary

  const {[model.options.primaryKey]: primaryKey} = value

  for (const indexKey in model.options.index) {
    const index = model.options.index[indexKey]
    const curSecondaryKey = index.key(value)

    const curSecondaryKeys = Array.isArray(curSecondaryKey) ? curSecondaryKey : [curSecondaryKey]

    // delete current index
    for (const secondaryKey of curSecondaryKeys) {
      if (secondaryKey === null || secondaryKey === undefined) continue // skip nullish
      _indexDelete(model, op, index, indexKey, primaryKey as Deno.KvKeyPart, secondaryKey)
    }
  }

  return options?.transaction ? true : _commit(model, op, true, 'delete')
}

const _deleteByIndex = async (
  model: KvModelContext,
  indexKey: string,
  secondaryKey: Deno.KvKeyPart,
  options?: DeleteByIndexOptions & KvPageOptions<unknown>,
) => {
  const primaryKey = await _findByIndex(model, indexKey, secondaryKey, options)
  if (Array.isArray(primaryKey)) { // relation 'many'
    for (const key of primaryKey) {
      await _delete(model, key as Deno.KvKeyPart, options)
    }
    return true
  } else { // relation 'one'
    return _delete(model, primaryKey as Deno.KvKeyPart, options)
  }
}

// Utils
export const indexManager = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  // local
  const RequiredInput = OmitOptionalFields<Input>,
  const PrimaryKey extends PropertyKey = keyof RequiredInput,
  TIndex extends {[k: string]: Index<Output>} = {[k: string]: Index<Output>},
>(_model: KvModel<Schema, PrimaryKey, TIndex>) => {
  const model = _model[Internal]

  return {
    /**
     * Delete `index`
     */
    async delete(key) {
      const options = model.options
      for (const indexKey in options.index) {
        if (key && key !== indexKey) continue
        const iter = model.kv.list({prefix: [`${options.prefix}-${indexKey}`]})
        for await (const item of iter) {
          await model.kv.delete(item.key)
        }
      }
    },

    /**
     * Create `index`
     */
    async create(key) {
      const iter = model.kv.list({prefix: [model.options.prefix]})
      for await (const {value} of iter) {
        const op = /* options?.op ?? */ model.kv.atomic()
        const primaryKey = (value as any)[model.options.primaryKey] as Deno.KvKeyPart

        // index
        for (const indexKey in model.options.index) {
          if (key && key !== indexKey) continue

          const index = model.options.index[indexKey]
          const secondaryKey = index.key(value)

          const secondaryKeys = Array.isArray(secondaryKey) ? secondaryKey : [secondaryKey]
          for (const secondaryKey of secondaryKeys) {
            if (secondaryKey === null || secondaryKey === undefined) continue // skip nullish
            _indexCreate(model, op, index, indexKey, primaryKey, secondaryKey)
          }
        }

        await _commit(model, op, null, 'index-create')
      }
    },
  } as {
    delete(key?: string): Promise<void>
    delete(key?: keyof TIndex): Promise<void>

    create(key?: string): Promise<void>
    create(key?: keyof TIndex): Promise<void>
  }
}

Deno.test('Test 518845 indexManager', async (t) => {
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
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })
  const index = indexManager(model)

  for (let i = 0; i < 3; i++) {
    await model.create({username: `user${i}`, age: 18})
  }

  await index.delete()
  expect(await model.findByIndex('age', 18)).toEqual([])

  await index.create()
  expect(await model.findByIndex('age', 18)).toEqual(['1', '2', '3'])
})

Deno.test('Test 000000', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const schema = z.object({
    id: z.string(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
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
  let id = 0

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
    primaryKeyType: () => id++,
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
    primaryKeyType: () => `${id++}`,
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

Deno.test('Test 235235 find', async (t) => {
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
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  const user1 = await model.create({username: 'user1', age: 18})
  const user2 = await model.create({username: 'user2', age: 18})

  expect(await model.find(user1.id)).toEqual({id: '1', username: 'user1', age: 18})
  expect(await model.find(user2.id)).toEqual({id: '2', username: 'user2', age: 18})
  expect(await model.find('none')).toEqual(null)
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
    primaryKeyType: () => `${id++}`,
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

Deno.test('Test 499237 findByIndex', async (t) => {
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
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 18})
  await model.create({username: 'user4', age: 17})
  await model.create({username: 'user5', age: 19})

  expect(await model.findByIndex('username', 'user1')).toEqual('1')
  expect(await model.findByIndex('username', 'user1', {resolve: true})).toEqual({id: '1', username: 'user1', age: 18})

  expect(await model.findByIndex('username', 'none')).toEqual(null)
  expect(await model.findByIndex('username', 'none', {resolve: true})).toEqual(null)

  expect(await model.findByIndex('age', 18)).toEqual(['1', '2', '3'])
  expect(await model.findByIndex('age', 17, {resolve: true})).toEqual([
    {id: '4', username: 'user4', age: 17},
  ])

  expect(await model.findByIndex('age', 100)).toEqual([])
  expect(await model.findByIndex('age', 100, {resolve: true})).toEqual([])
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
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  const user = await model.create({username: 'user1', age: 18})
  expect(user).toEqual({id: '1', username: 'user1', age: 18})

  const updata1 = await model.update(user.id, {age: 19})
  console.log({updata1})
  expect(updata1).toEqual({id: '1', username: 'user1', age: 19})

  const updata2 = await model.update(user.id, (v) => {
    v.age = 20
  })
  expect(updata2).toEqual({id: '1', username: 'user1', age: 20})

  const updata3 = await model.update(user.id, (v) => {
    return {
      id: 'new id', // ignore
      age: 21,
    }
  })
  expect(updata3).toEqual({id: '1', username: 'user1', age: 21})
})

Deno.test('Test 399377 delete', async (t) => {
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
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 18})

  //
  await model.delete('1')

  const op = model.atomic()
  await model.delete('2', {op, transaction: true})
  await model.delete('3', {op})

  const userList = await model.findMany()
  expect(userList).toEqual([])
})

Deno.test('Test 737649 deleteByIndex', async (t) => {
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
    primaryKeyType: () => `${id++}`.padStart(2, '0'),
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 18})
  await model.create({username: 'user4', age: 17})
  await model.create({username: 'user5', age: 19})

  await model.deleteByIndex('username', 'user2')
  expect(await model.findMany()).toEqual([
    {id: '01', username: 'user1', age: 18},
    {id: '03', username: 'user3', age: 18},
    {id: '04', username: 'user4', age: 17},
    {id: '05', username: 'user5', age: 19},
  ])

  await model.deleteByIndex('age', 18)
  expect(await model.findMany()).toEqual([
    {id: '04', username: 'user4', age: 17},
    {id: '05', username: 'user5', age: 19},
  ])

  for (let i = 5; i < 60; i++) {
    await model.create({username: `user${i}`, age: 18})
  }

  await model.deleteByIndex('age', 18)
  expect(await model.findMany()).toEqual([
    {id: '04', username: 'user4', age: 17},
    {id: '05', username: 'user5', age: 19},
    {id: '56', username: 'user55', age: 18},
    {id: '57', username: 'user56', age: 18},
    {id: '58', username: 'user57', age: 18},
    {id: '59', username: 'user58', age: 18},
    {id: '60', username: 'user59', age: 18},
  ])
})
