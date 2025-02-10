import {StandardSchemaV1} from 'npm:@standard-schema/spec'
import {z} from 'zod'
import {KvPageOptions} from './deno/kvLib.ts'

type GetPrimitiveKey<TObject> = {
  [K in keyof TObject as TObject[K] extends Deno.KvKeyPart
    ? undefined extends TObject[K]
      ? never
      : K
    : never]: TObject[K]
}

type PrimaryKeyType = 'ulid' | 'uuid4'

type ModelOptions<
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
    key: (value: Output) => Deno.KvKeyPart
  }
}

type IndexOptionsResult<Index extends IndexOptions<any, any>> = {
  [K in keyof Index]: {
    type: Index[K]['relation'] extends 'many' ? 'many' : 'one'
    key: ReturnType<Index[K]['key']>
  }
}


const model = <
  Schema extends StandardSchemaV1, //
  Options extends ModelOptions<Schema, string>
>(
  schema: Schema,
  options: Options
) => {
  type IndexMap = IndexOptionsResult<Options['index']>
  type IndexKey = keyof Options['index']

  type PrimaryKey = Options['primaryKey']
  type PrimaryKeyType = Output[PrimaryKey]

  type Input = StandardSchemaV1.InferInput<Schema>
  type Output = StandardSchemaV1.InferOutput<Schema>

  // FIND by index
  type FindResolve = {resolve: true}
  type FindNoResolve = {resolve?: false}
  type FindByIndex = {
    // Find primary keys
    <K extends keyof IndexMap>(
      key: K,
      value: IndexMap[K]['key'],
      options?: IndexMap[K]['type'] extends 'one'
        ? FindNoResolve
        : IndexMap[K]['type'] extends 'many'
        ? FindNoResolve & KvPageOptions<PrimaryKeyType>
        : never
    ): Promise<
      IndexMap[K]['type'] extends 'one' ? PrimaryKeyType : IndexMap[K]['type'] extends 'many' ? PrimaryKeyType[] : never
    >
    // Find and resolve primary object
    <K extends keyof IndexMap>(
      key: K,
      value: IndexMap[K]['key'],
      options: IndexMap[K]['type'] extends 'one'
        ? FindResolve
        : IndexMap[K]['type'] extends 'many'
        ? FindResolve & KvPageOptions<PrimaryKeyType>
        : never
    ): Promise<
      IndexMap[K]['type'] extends 'one' //
        ? Output
        : IndexMap[K]['type'] extends 'many'
        ? Output[]
        : never
    >
  }

  return {
    a: {} as IndexMap,
    b: {} as IndexKey,
    findByIndex: {} as FindByIndex,
  }
}

const schema = z.object({
  // id: z.string(),
  id: z.number(),
  str: z.string(),
  num: z.number(),
})
const factory = model(schema, {
  prefix: 'prefix',
  primaryKey: 'id',
  index: {
    a: {key: (v) => v.str},
    b: {key: (v) => v.num},
    c: {key: (v) => v.num, relation: 'many'},
  },
})

factory.findByIndex('a', 'str')
factory.findByIndex('a', 'str', {resolve: true})

const arr = factory.findByIndex('c', 1)
const arrC = factory.findByIndex('c', 1, {resolve: true})

factory.findByIndex('c', 1, {resolve: true})

