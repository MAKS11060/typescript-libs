/**
 * The {@linkcode KvModel model} creates an abstract layer for storing typed objects inside {@linkcode Deno.Kv}
 *
 * - CRUD operations are strongly typed
 * - To create a {@linkcode KvModel}, you can select any library that supports the
 *  {@link https://github.com/standard-schema/standard-schema#what-schema-libraries-implement-the-spec Standard schema}
 * - Index support for object search
 *
 * @module kvModel
 */

import type { StandardSchemaV1 } from '@standard-schema/spec'
import { chunk } from '@std/collections/chunk'
import { ulid } from '@std/ulid/ulid'
import { z } from 'zod/v4'
import { standardValidate } from './_standardValidate.ts'
import { getKvPage } from './kv_helper.ts'

chunk
ulid
standardValidate
getKvPage

type Array2Union<T> = T extends Array<infer O> ? O : T

type GetPrimitiveKey<TObject> = {
  [
    K in keyof TObject as TObject[K] extends Deno.KvKeyPart ? undefined extends TObject[K] ? never
      : K
      : never
  ]: TObject[K]
}

type PrimaryKeyType = 'ulid' | 'uuid4' | 'uuid7' | (() => string)

type CreateOptions<Key> = {
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

type TransactionOption = {
  /** override `AtomicOperation` for one transaction */
  op: Deno.AtomicOperation
  /** Prevents saves. To combine into one transaction */
  transaction: true
}

//
type GetIndexValue<T, K extends PropertyKey> = T extends {
  [k in K]: {
    /** @default one */
    relation?: 'one' | 'many'
    key(value: unknown): infer O
  }
} ? O
  : never
type GetIndexRelation<T, K extends PropertyKey> = T extends {
  [k in K]: {
    /** @default one */
    relation?: infer O
  }
} ? O extends 'many' ? 'many' : 'one'
  : never

interface KvModelIndexItem<T> {
  /** @default one */
  relation?: 'one' | 'many'
  key(value: T): Deno.KvKeyPart | Deno.KvKeyPart[] | null | undefined | void
}

interface ModelConfig<PrimaryKey = string, IndexKey extends PropertyKey = string> {
  primaryKey: PrimaryKey
  primaryKeyType?: PrimaryKeyType
  index?: {
    [K in IndexKey]: KvModelIndexItem<StandardSchemaV1.InferOutput<Schema>>
  }
}

interface KvModel<
  Input,
  Output,
  PrimaryKey extends keyof Output,
  IndexKey extends PropertyKey,
  Index extends
    | { [K in IndexKey]: KvModelIndexItem<Output> }
    | undefined,
  TModel extends ModelConfig,
  ////////////////////////////////
  PrimaryKeyType = Output[PrimaryKey],
  InputWithoutKey = Omit<Input, PrimaryKey>,
> {
  create(input: InputWithoutKey, options: CreateOptions<PrimaryKeyType> & TransactionOption): Output
  create(input: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>): Promise<Output>

  find(key: PrimaryKeyType): Output

  // findByIndex(key: IndexKey, value: GetIndexValue<Index, IndexKey>): Output
  findByIndex<T extends IndexKey>(key: T, value: GetIndexValue<Index, T>): GetIndexRelation<Index, T>
}

//// TEST
type UserSchema = {
  id: string
  username: string
  type: 'admin' | 'user'
}
type UserModel = KvModel<UserSchema, UserSchema, 'id', 'name' | 'type', {
  name: {key(): string}
  type: {relation: 'many'; key(): string}
}>

const a = {} as UserModel
a.findByIndex('name', '')

//
export const kvModel = <
  Schema extends StandardSchemaV1,
  PrimaryKey extends keyof StandardSchemaV1.InferOutput<Schema>,
  IndexKey extends PropertyKey,
  TModel extends ModelConfig<PrimaryKey, IndexKey>,
>(
  kv: Deno.Kv,
  schema: Schema,
  modelOptions: TModel,
): KvModel<
  StandardSchemaV1.InferInput<Schema>,
  StandardSchemaV1.InferOutput<Schema>,
  PrimaryKey,
  IndexKey,
  typeof modelOptions['index'],
  TModel
> => {
  modelOptions

  return {} as any
}

Deno.test('kvModel()', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const user = z.object({
    id: z.ulid(),
    idInt: z.int(),
    username: z.string(),
    avatar: z.string().nullable().default(null),
    email: z.email().nullish().default(null),
    get friends() {
      return z.array(user).optional()
    },
  })
  const userModel = kvModel(kv, user, {
    primaryKey: 'id',
    index: {
      username: {key: (v) => v.username},
      email: {key: (v) => v.email},
      null: {key: (v) => null},
      undef: {key: (v) => undefined},
      void: {key: (v) => {}},
      arr: {key: (v) => []},
      friend: {relation: 'many', key: (v) => v.friends?.map((v) => v.id)},
    },
  })

  // userModel.create({username: 'test',idInt: 1})
  // userModel.find('1')

  // userModel.findByIndex('username', '')
  // userModel.findByIndex('null')

  // userModel.findByIndex('username') === 'one'
  // userModel.findByIndex('friend') === 'one'
})
