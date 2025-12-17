/**
 * The {@linkcode kvModel model} creates an abstract layer for storing typed objects inside {@linkcode Deno.Kv}
 *
 * - CRUD operations are strongly typed
 * - To create a {@linkcode kvModel}, you can select any library that supports the
 *  {@link https://github.com/standard-schema/standard-schema#what-schema-libraries-implement-the-spec Standard schema}
 * - Index support for object search
 *
 * @module kvModel
 */

import type {StandardSchemaV1} from '@standard-schema/spec'
import {chunk} from '@std/collections/chunk'
import {ulid} from '@std/ulid/ulid'
import {generate as randomUUID7} from '@std/uuid/unstable-v7'
import {equal} from '@std/assert/equal'
import {standardValidate} from './_standardValidate.ts'
import {getKvPage, type KvPageOptions} from './kv_helper.ts'

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
   * Create one `record`
   * @example
   * ```ts
   * const user = userModel.create({username: 'user1', age: 18})
   * ```
   */
  create(data: InputWithoutPrimaryKey, options?: CreateOptions<InputPrimaryKeyType>): Promise<Output>

  /**
   * Create one `record` with `transaction`
   * @example
   * ```ts
   * const op = userModel.atomic()
   *
   * const user1 = userModel.create({username: 'user1', age: 18}, {op, transaction: true})
   * const user2 = userModel.create({username: 'user2', age: 18}, {op})
   * ```
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

  /**
   * Delete one `record`
   * @example
   * ```ts
   * await model.delete('1')
   * ```
   */
  delete(key: InputPrimaryKeyType, options?: DeleteOptions): Promise<boolean>

  /**
   * Delete one `record` with `transaction`
   * @example
   * ```ts
   * await userModel.delete('1')
   *
   * const op = model.atomic()
   * await userModel.delete('2', {op, transaction: true})
   * await userModel.delete('3', {op})
   * ```
   */
  delete(key: InputPrimaryKeyType, options: TransactionOption): void

  /**
   * Delete by `index`
   * @example
   * ```ts
   * await userModel.deleteByIndex('username', 'user1')
   * ```
   */
  deleteByIndex<Key extends IndexKeyof<Index>>(
    key: Key,
    val: IndexReturnType<Index, Key>,
    options?: DeleteByIndexOptions & KvPageOptions<OutputPrimaryKeyType>,
  ): Promise<boolean>
}

interface KvModelContext {
  kv: Parameters<typeof kvModel>['0']
  schema: Parameters<typeof kvModel>['1']
  options: Parameters<typeof kvModel>['2']
}

export const kvModel = <
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

interface IndexManager<
  TIndex extends {[k: string]: Index<unknown>},
> {
  delete(key?: string): Promise<void>
  delete(key?: keyof TIndex): Promise<void>
  create(key?: string): Promise<void>
  create(key?: keyof TIndex): Promise<void>
}

/**
 * Utils for create or delete `index`
 *
 * @example
 * ```ts
 * using kv = await Deno.openKv(':memory:')
 *
 * const schema = z.object({
 *   id: z.string(),
 *   username: z.string(),
 *   age: z.int().positive(),
 * })
 * const model = kvModel(kv, schema, {
 *   prefix: 'user',
 *   primaryKey: 'id',
 *   index: {
 *     username: {key: (v) => v.username.toLowerCase()},
 *     age: {relation: 'many', key: (v) => v.age},
 *   },
 * })
 * const index = indexManager(model)
 *
 * for (let i = 0; i < 3; i++) {
 *   await model.create({username: `user${i}`, age: 18})
 * }
 *
 * await index.delete()
 * await model.findByIndex('age', 18) // []
 *
 * await index.create()
 * await model.findByIndex('age', 18)) // ['1', '2', '3']
 * ```
 */
export const indexManager = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  // local
  const RequiredInput = OmitOptionalFields<Input>,
  const PrimaryKey extends PropertyKey = keyof RequiredInput,
  TIndex extends {[k: string]: Index<Output>} = {[k: string]: Index<Output>},
>(_model: KvModel<Schema, PrimaryKey, TIndex>): IndexManager<TIndex> => {
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
  }
}
