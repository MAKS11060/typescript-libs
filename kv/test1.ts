import { StandardSchemaV1 } from '@standard-schema/spec'
import { z } from 'zod/v4'

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

type CreateOptions<Key = unknown> = {
  /** Set `PrimaryKey` */
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

// Index
type ExtractArray<T> = T extends Array<infer O> ? O : T
interface Index<T = unknown> {
  relation?: 'one' | 'many'
  key(value: T): Deno.KvKeyPart | null | undefined | void | (Deno.KvKeyPart | null | undefined | void)[]
}
type IndexKeyof<T> = T extends { [K in infer O]: Index } ? O : never
type IndexRelation<T, K extends PropertyKey> = T extends { [k in K]: {relation: infer O} } ? O
  : unknown
type IndexReturnType<T, K extends PropertyKey> = T extends {
  [k in K]: {key(...args: unknown[]): infer O}
} ? ExtractArray<O> | null | undefined | void // allow empty value
  : unknown

interface Model<
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
  primaryKey: PrimaryKey
  index: Options

  create(input: InputWithoutPrimaryKey, options?: CreateOptions<InputPrimaryKeyType>): Output
  findByIndex<Key extends IndexKeyof<Index>>(
    key: Key,
    val: IndexReturnType<Index, Key>,
    options?: {resolve?: false},
  ): IndexRelation<Index, Key> extends 'many' //
    ? Promise<OutputPrimaryKeyType[]>
    : Promise<OutputPrimaryKeyType | null>
}

const createModel = <
  Schema extends StandardSchemaV1<DefaultSchema>,
  Input = StandardSchemaV1.InferInput<Schema>,
  Output = StandardSchemaV1.InferOutput<Schema>,
  // local
  const RequiredInput = OmitOptionalFields<Input>,
  const PrimaryKey = keyof RequiredInput,
  TIndex = {[k: string]: Index<Output>},
>(
  schema: Schema,
  options: {
    prefix: string

    primaryKey: PrimaryKey

    primaryKeyType:
      | 'ulid'
      | 'uuid4'
      | 'uuid7'
      | (() => RequiredInput[PrimaryKey extends keyof RequiredInput ? PrimaryKey : never])

    index?: TIndex
  },
): Model<Schema, PrimaryKey, TIndex> => ({schema, options} as any)

Deno.test('Test 737423', async (t) => {
  const userSchema = z.object({
    id: z.int(),
    // id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
  })
  const model = createModel(userSchema, {
    prefix: '',
    primaryKey: 'id',
    primaryKeyType: () => 1,
    index: {
      i1: {key: (value) => value.username},
      i2: {key: (value) => 123},
    },
  })
  model.primaryKey satisfies 'id'
  model.create({username: ''}, {key: 1})
  model.create({username: ''}, {key: 1})

  model.findByIndex('i1', '123')
  model.findByIndex('i2', 1)

  // model.findByIndex('')
  model satisfies 1
})
