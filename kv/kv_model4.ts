import { printKV } from '@maks11060/kv/helper'
import { StandardSchemaV1 } from '@standard-schema/spec'
import { ulid } from 'jsr:@std/ulid'
import { generate as randomUUID7 } from 'jsr:@std/uuid/unstable-v7'
import { z } from 'zod/v4'
import { standardValidate } from './_standardValidate.ts'

type ExtractArray<T> = T extends Array<infer O> ? O : T

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
  Options extends KvModelOptions,
  //
  PrimaryKey extends Options['primaryKey'] = Options['primaryKey'],
  PrimaryKeyType = Output[PrimaryKey],
  InputWithoutKey = Omit<Input, PrimaryKey>,
> {}

interface KvModelOptions<
  Output extends DefaultSchema = DefaultSchema,
  PrimaryKey extends keyof Output = keyof Output,
  // PKType = keyof Output[NoInfer<PrimaryKey>],
  PKType = PrimaryKey,
> {
  primaryKey: /* keyof Output */ PrimaryKey
  primaryKeyT: PKType
  /**
   * Configuring the primary key generator. You can also specify the primary key in the {@linkcode KvModel.create} method
   * @default ulid */
  primaryKeyType?: PrimaryKeyType<Output[PrimaryKey]>
  index?: {[k: string]: Index<Output>}
}

interface KvModelContext {
  kv: Deno.Kv
  schema: StandardSchemaV1<DefaultSchema>
  options: KvModelOptions
}

interface Index<T = unknown> {
  relation?: 'one' | 'many'
  key(value: T): Deno.KvKeyPart | null | undefined | void | (Deno.KvKeyPart | null | undefined | void)[]
}

const createModel = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  const PK extends keyof StandardSchemaV1.InferOutput<Schema>,
  const Options extends KvModelOptions<StandardSchemaV1.InferOutput<Schema>, PK>,
>(
  kv: Deno.Kv,
  schema: Schema,
  options: Options,
): KvModel<
  StandardSchemaV1.InferInput<Schema>,
  StandardSchemaV1.InferOutput<Schema>,
  Options
> => {
  const model: KvModelContext = {kv, schema, options}
  return {}
}

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
    primaryKeyT: 'email',
    // primaryKeyType: () => '',
    // index: {
    //   i1: {relation: 'one', key: (v) => v.username},
    //   i2: {key: (v) => v.email},
    // },
  })

  const user = await userModel.create({username: 'test'})
  console.log({user})

  printKV(kv)
})
