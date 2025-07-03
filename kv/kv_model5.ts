import { StandardSchemaV1 } from '@standard-schema/spec'
import z from 'zod/v4'

type OmitOptionalFields<TObject> = {
  [
    K in keyof TObject as //
    TObject[K] extends Deno.KvKeyPart //
      ? TObject[K] extends undefined ? never
      : K
      : never
  ]: TObject[K]
}

type DefaultSchema = {}

type PrimaryKeyType<T = string> = 'ulid' | 'uuid4' | 'uuid7' | (() => T)

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

interface KvModelOptions<
  Input,
  Output,
  PrimaryKey, // {id: any}
> {
  // primaryKey: keyof PrimaryKey
  primaryKey: PrimaryKey
  primaryKeyType?: PrimaryKeyType<
    Input[PrimaryKey extends keyof OmitOptionalFields<Input> ? PrimaryKey : never]
  >
}

interface KvModel<
  Input,
  Output,
  PrimaryKey,
  //
  InputWithoutKey = Omit<Input, PrimaryKey extends keyof Input ? keyof Input : never>,
  PrimaryKeyT = Input[PrimaryKey extends keyof Input ? keyof Input : never],
> {
  key: PrimaryKey extends keyof Input ? keyof Input : never

  create(data: InputWithoutKey, options?: CreateOptions<PrimaryKeyT>): Promise<Output>
}

const createModel = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  // PrimaryKeyRecord = OmitOptionalFields<Input>,
  PrimaryKey = keyof OmitOptionalFields<Input>,
>(
  kv: Deno.Kv,
  schema: Schema,
  options: KvModelOptions<Input, Output, PrimaryKey>,
): KvModel<Input, Output, PrimaryKey> => {
  return {} as any
}

Deno.test('Test 858885', async (t) => {
  using kv = await Deno.openKv(':memory:')
  const userSchema = z.object({
    id: z.int(),
    // id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => 1,
  })

  userModel.key

  // userModel.create({username: 'test'}, {key: ''})
})
