import { printKV } from '@maks11060/kv/helper'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { ulid } from 'jsr:@std/ulid'
import { generate as randomUUID7 } from 'jsr:@std/uuid/unstable-v7'
import { keyof, z } from 'zod/v4'
import { standardValidate } from './_standardValidate.ts'

type ExtractArray<T> = T extends Array<infer O> ? O : T

type OmitOptionalFields<TObject> = {
  [
    K in keyof TObject as //
    TObject[K] extends Deno.KvKeyPart //
      ? TObject[K] extends undefined ? never
      : K
      : never
  ]: TObject[K]
}

type PrimaryKeyType<T = string> = 'ulid' | 'uuid4' | 'uuid7' | (() => T)

type DefaultSchema = {}

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
  Input,
  Output,
  Options extends KvModelOptions<Input, Output>,
  //
  PrimaryKey extends Options['primaryKey'] = Options['primaryKey'],
  PrimaryKeyType = Output[PrimaryKey],
  InputWithoutKey = Omit<Input, PrimaryKey>,
> {
  /**
   * Create `transaction`
   */
  atomic(): Deno.AtomicOperation

  /**
   * Create `record`
   */
  create(data: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>): Promise<Output>
  /**
   * Transaction
   */
  create(data: InputWithoutKey, options: CreateOptions<PrimaryKeyType> & TransactionOption): Output

  find(key: Output[PrimaryKey]): Promise<Output | null>

  // findMany(key: Output[PrimaryKey]): Promise<Output | null>

  // no resolve
  findByIndex<Key extends IndexKeyof<Options>>(
    key: Key,
    val: IndexReturnType<Options, Key>,
    options?: {resolve?: false},
  ): IndexRelation<Options, Key> extends 'many' //
    ? Promise<PrimaryKeyType[]>
    : Promise<PrimaryKeyType | null>

  // resolve
  findByIndex<Key extends IndexKeyof<Options>>(
    key: Key,
    val: IndexReturnType<Options, Key>,
    options: {resolve: true},
  ): IndexRelation<Options, Key> extends 'many' //
    ? Promise<Output[]>
    : Promise<Output | null>

  update(
    key: PrimaryKeyType,
    input: Partial<InputWithoutKey>,
    options?: UpdateOptions,
  ): Promise<Output>

  update(
    key: PrimaryKeyType,
    handler: (val: Output) => Promise<Partial<InputWithoutKey> | void> | Partial<InputWithoutKey> | void,
    options?: UpdateOptions,
  ): Promise<Output>

  remove(key: PrimaryKeyType, options: TransactionOption): void
  remove(key: PrimaryKeyType, options?: RemoveOptions): Promise<boolean>

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

interface KvModelOptions<Input, Output, PrimaryKey = {}> {
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
   * Available types for {@linkcode KvModelOptions.primaryKey}:
   * 1. {@linkcode Uint8Array}
   * 2. {@linkcode String}
   * 3. {@linkcode Number}
   * 4. {@linkcode BigInt}
   * 5. {@linkcode Boolean}
   */
  primaryKey: keyof PrimaryKey

  /**
   * Configuring the primary key generator. You can also specify the primary key in the {@linkcode KvModel.create} method
   * - `ulid`  - `timestamp` + `rand`
   * - `uuid4` - {@linkcode crypto.randomUUID}
   * - `uuid7` - `timestamp` + `rand`
   * - `() => '1'`
   *
   * @default ulid
   */
  primaryKeyType: PrimaryKeyType<
    Input[keyof PrimaryKey extends keyof OmitOptionalFields<Input> ? keyof PrimaryKey : never]
  >

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
  index?: {[k: string]: Index<Output>}
}

interface KvModelContext {
  kv: Deno.Kv
  schema: StandardSchemaV1<DefaultSchema>
  options: KvModelOptions
}

// Index
interface Index<T = unknown> {
  relation?: 'one' | 'many'
  key(value: T): Deno.KvKeyPart | null | undefined | void | (Deno.KvKeyPart | null | undefined | void)[]
}
type IndexKeyof<T> = T extends {index: { [K in infer O]: Index }} ? O : never
type IndexRelation<T, K extends PropertyKey> = T extends {
  index: { [k in K]: {relation: infer O} }
} ? O
  : unknown
type IndexReturnType<T, K extends PropertyKey> = T extends {
  index: { [k in K]: {key(...args: unknown[]): infer O} }
} ? ExtractArray<O> | null | undefined | void // allow empty value
  : unknown

interface KvModel2<
  Input,
  Output,
  PrimaryKey,
  //
  PrimaryKeyType = Input[keyof PrimaryKey extends keyof Input ? keyof Input : never],
  InputWithoutKey = Omit<Input, PrimaryKey extends keyof Input ? keyof Input : never>,
> {

  create(data: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>): Promise<Output>

}

/**
 * @example
 * ```ts
 * const userSchema = z.object({
 *   id: z.int(),
 *   username: z.string(),
 *   email: z.string().nullish().default(null),
 *   get friendsId() {
 *     return userSchema.shape.id.array().optional()
 *   },
 * })
 *
 * const userModel = createModel(userSchema, {
 *   prefix: 'user',
 *   primaryKey: 'id',
 *   index: {
 *     username: {relation: 'one', key: (v) => v.username},
 *     email: {key: (v) => v.email},
 *     friends: {relation: 'many', key: (v) => v.friendsId},
 *   },
 * })
 * ```
 */
const createModel = <
  // Schema extends StandardSchemaV1<DefaultSchema>,
  // PK extends StandardSchemaV1.InferOutput<Schema>,
  // Options extends KvModelOptions<StandardSchemaV1.InferOutput<Schema>, PK>,
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  PrimaryKey = OmitOptionalFields<Input>,
>(
  kv: Deno.Kv,
  schema: Schema,
  options: KvModelOptions<Input, Output, PrimaryKey>,
): KvModel2<Input, Output, PrimaryKey> => {
  const model: KvModelContext = {kv, schema, options}

  return {
    atomic() {
      return kv.atomic()
    },

    create(data, options) {
      return _create(model, data, options) as Promise<DefaultSchema>
    },

    find(key) {
      return _find(model, key)
    },
    // findByIndex(key, val, options) {
    //   // return _findByIndex(model, key, val, options)
    // },
  }
}

const generateKey = (type: PrimaryKeyType = 'ulid') => {
  if (type === 'ulid') {
    return ulid()
  } else if (type === 'uuid4') {
    crypto.randomUUID()
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

const _find = async (model: KvModelContext, key: unknown) => {
}

const _findByIndex = async (model: KvModelContext, key: unknown, val: unknown, options?: {resolve?: boolean}) => {}

const _updata = async (model: KvModelContext, key: unknown, val: unknown, options?: {resolve?: boolean}) => {}

const _remove = async (model: KvModelContext, key: unknown, val: unknown, options?: {resolve?: boolean}) => {}

const _removeByIndex = async (model: KvModelContext, key: unknown, val: unknown, options?: {}) => {}

Deno.test('Test 163078', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
    get friends() {
      return userSchema.array().optional()
    },
    get friendsId() {
      return userSchema.shape.id.array().optional()
    },
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    index: {
      i1: {relation: 'one', key: (v) => v.username},
      i2: {relation: 'one', key: (v) => {}},
      i3: {relation: 'one', key: (v) => Math.random() > .5 ? undefined : v.id},
      i4: {key: (v) => {}},
      i5: {relation: 'many', key: (v) => {}},
      i6: {key: (v) => v.email},
      i7: {relation: 'many', key: (v) => v.friends?.map((v) => v.id)},
      i8: {relation: 'many', key: (v) => v.friendsId},
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
  await userModel.findByIndex('i8', 1) satisfies number[] | null
})

Deno.test('Test 769679', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => 1,
    index: {
      i1: {relation: 'one', key: (v) => v.username},
      i2: {key: (v) => v.email},
    },
  })

  const user = await userModel.create({username: 'test'})
  console.log({user})

  printKV(kv)
})
