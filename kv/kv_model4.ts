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

interface KvModelContext {
  kv: Deno.Kv
  schema: StandardSchemaV1<DefaultSchema>
  options: KvModelOptions
}

interface Index<T = unknown> {
  relation?: 'one' | 'many'
  key(value: T): Deno.KvKeyPart | null | undefined | void | (Deno.KvKeyPart | null | undefined | void)[]
}

Deno.test('Test 769679', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    idStr: z.string(),
    id: z.int(),
    idU8: z.instanceof(Uint8Array),
    username: z.string(),
    email: z.string().nullish().default(null),
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'idStr',
    primaryKeyType: () => {},
    // primaryKeyType: () => 1,
    index: {
      i1: {relation: 'one', key: (v) => v.username},
      i2: {key: (v) => v.email},
    },
  })

  // const user = await userModel.create({username: 'test'})
  // console.log({user})

  printKV(kv)
})

interface CreateModelOptions<
  Input extends DefaultSchema = DefaultSchema,
  Output extends DefaultSchema = DefaultSchema,
  PrimaryKey = unknown,
> {
  prefix: string
  primaryKey: keyof PrimaryKey
  primaryKeyType: PrimaryKeyType<
    Input[keyof PrimaryKey extends keyof OmitOptionalFields<Input> ? keyof PrimaryKey : never]
  >
  index?: {[k: string]: Index<Output>}
}

type KvModel2<
  // Input extends DefaultSchema,
  // Output extends DefaultSchema,
  Options extends CreateModelOptions,
  // Options extends KvModelOptions<Input, Output, PrimaryKey>,
  PrimaryKey extends Options['primaryKey'] = Options['primaryKey'],
  PrimaryKeyType = Output[PrimaryKey],
  InputWithoutKey = Omit<Input, PrimaryKey>,
> = {
  create(data: InputWithoutKey, options?: CreateOptions<PrimaryKeyType>): Promise<Output>
}

const create = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  PrimaryKey = OmitOptionalFields<Input>,
>(
  schema: Schema,
  options: CreateModelOptions<Input, Output, PrimaryKey>,
): KvModel2<
  CreateModelOptions<Input, Output, PrimaryKey>
> => {
  return {} as any
}

Deno.test('Test 090345', async (t) => {
  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
    id_str: z.string(),
    id_u8: z.instanceof(Uint8Array),
  })
  create(userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => 1,
  }) satisfies CreateModelOptions<
    {id: number; username: string; email?: string | null | undefined}, // Input
    {id: number; username: string; email: string | null}, // Output
    {id: any} // PrimaryKey
  >
  create(userSchema, {
    prefix: 'user',
    primaryKey: 'username',
    primaryKeyType: () => 1, // err
  })
  create(userSchema, {
    prefix: 'user',
    primaryKey: 'id_str',
    primaryKeyType: () => '',
  })
  create(userSchema, {
    prefix: 'user',
    primaryKey: 'id_u8',
    primaryKeyType: () => crypto.getRandomValues(new Uint8Array(16)),
  })
})
