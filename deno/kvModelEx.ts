import {ulid} from '@std/ulid'
import {z} from 'zod'
import {getKvPage, KvPageOptions} from './kvLib.ts'

type PrimaryKeyType = 'ulid' | 'uuid4' | (() => string)

type ModelOptions<Schema extends Record<string, any>, Index extends string> = {
  prefix: string // model name
  primaryKey: keyof Schema
  /** @default ulid  */
  primaryKeyType?: PrimaryKeyType
  index: Index[]
  indexOptions: {
    [K in Index]: {
      /** @default one  */
      relation?: 'one' | 'many'
      key: (value: Schema) => unknown /* | unknown[] */
    }
  }
}

//
// CREATE
//
interface CreateOptions<Key> {
  /** Set `Primary` key */
  key?: Key
  /** expireIn in `milliseconds` */
  expireIn?: number
  /** @default false - Don't check before rewriting */
  force?: boolean
  /** override `AtomicOperation` for one transaction */
  op?: Deno.AtomicOperation
  /** @default false - Prevents saves. To combine into one transaction */
  transaction?: boolean
}

const _create = async <Output extends Record<string, any>>(
  op: Deno.AtomicOperation,
  output: Output /* validated object */,
  modelOptions: ModelOptions<Output, any>,
  options?: CreateOptions<any>
) => {
  const primaryKey = output[modelOptions.primaryKey] // primaryKey

  // primary
  op.set([modelOptions.prefix, primaryKey], output, options)

  // index
  for (const indexKey of modelOptions.index) {
    const indexOption = modelOptions.indexOptions[indexKey]
    const secondaryKey = indexOption.key(output) as Deno.KvKeyPart // TODO: handle array

    if (!indexOption.relation || indexOption.relation === 'one') {
      const key = [`${modelOptions.prefix}-${indexKey}`, secondaryKey] // ['user-username', 'user_1']
      op.set(key, primaryKey, options) // key => primaryKey
      if (!options?.force) op.check({key, versionstamp: null})
    } else if (indexOption.relation === 'many') {
      const key = [`${modelOptions.prefix}-${indexKey}`, secondaryKey, primaryKey] // ['user-username', 'user_1', 'primaryKey']
      op.set(key, null, options) // key => null
      if (!options?.force) op.check({key, versionstamp: null})
    }
  }

  if (options?.transaction) return output

  const res = await op.commit()
  if (!res.ok) {
    console.error(`%c[KV|Create|${modelOptions.prefix}]`, 'color: green', 'Error')
    throw new Error('Commit failed', {cause: 'duplicate detected'})
  }

  return output
}

const createModelSource = (kv: Deno.Kv) => {
  const zodSchema = <Schema extends z.Schema>(schema: Schema) => {
    return {
      model: <Index extends string,const Options extends ModelOptions<z.output<Schema>, Index>>(
        modelOptions: ModelOptions<z.output<Schema>, Index>
      ) => {
        // type Options = ModelOptions<z.output<Schema>, Index>
        type PrimaryKey = Options['primaryKey']
        type PrimaryKeyType = z.input<Schema>[PrimaryKey]
        type InputWithoutKey = Omit<z.input<Schema>, PrimaryKey>
        type Output = z.output<Schema>
        type IndexKey = Options['index'][number] // index keys

        // PrimaryKey generator
        let generateKey = ulid
        if (modelOptions.primaryKeyType === 'uuid4') {
          generateKey = crypto.randomUUID
        } else if (typeof modelOptions.primaryKeyType === 'function') {
          generateKey = modelOptions.primaryKeyType
        }

        // FIND BY INDEX
        type FindByIndex = {
          /** Resolve `object` */
          <T extends IndexKey>(indexKey: T, value: Output[T], options: {resolve: true}): Promise<Output>
          /** Get object `primary key`  */
          // <T extends IndexKey>(indexKey: T, value: Output[T], options?: {resolve?: false}): Promise<Output[T]>
        }
        const findByIndex: FindByIndex = async () => {}
        const findManyByIndex = async () => {}

        return {
          create: (input: InputWithoutKey, options?: CreateOptions<PrimaryKey>) => {
            const key = options?.key ?? generateKey()
            const op = options?.op ?? kv.atomic()

            const output = schema.parse({
              ...input,
              [modelOptions.primaryKey]: key,
            }) as Output

            return _create(op, output, modelOptions, options)
          },

          find: async (key: PrimaryKeyType) => {
            const _key = [modelOptions.prefix, key]
            const res = await kv.get<Output>(_key)
            return res.value
          },

          findMany: async (options: KvPageOptions<PrimaryKeyType>) => {
            const kvPage = await getKvPage<Output, PrimaryKeyType>(kv, [modelOptions.prefix], options)
            return kvPage.map((v) => v.value)
          },

          findByIndex,
          findManyByIndex,
        }
      },
    }
  }

  return {
    zodSchema,
  }
}

// TEST
const idMap = new Map<string, number>()
const smallID = (key: string, start = 0) => {
  idMap.set(key, (idMap.get(key) ?? start) + 1)
  return `${key}_` + idMap.get(key)
}

Deno.test('1', async (t) => {
  // using kv = await Deno.openKv(':memory:')
  const kv = await Deno.openKv(':memory:')

  const {zodSchema} = createModelSource(kv)

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
    email: z.string().email(),
    age: z.number().default(18),
    info: z.object({
      test: z.boolean(),
    }),
  })

  const userModel = zodSchema(userSchema).model({
    prefix: 'user',
    primaryKey: 'id',
    // primaryKeyType: 'ulid',
    primaryKeyType: () => smallID('user'),
    index: ['username', 'email', 'age', 'info_test'],
    indexOptions: {
      username: {
        relation: 'one',
        key: ({username}) => username.toLowerCase(),
      },
      email: {
        relation: 'one',
        key: ({email}) => {
          const [name, host] = email.split('@', 2)
          return [name, host.toLowerCase()].join('@')
        },
      },
      age: {
        relation: 'many',
        key: ({age}) => age,
      },
      info_test: {
        relation: 'many',
        key: ({info}) => info.test,
      },
    },
  })

  // C
  for (let i = 1; i < 3; i++) {
    await userModel.create({
      username: `user_${i}`,
      nickname: `nick_${i}`,
      email: `test@test${i}.com`,

      // info: {
        // test: true,
      // },
    })
  }

  // await printKV(kv)

  // R
  // const user_1 = await userModel.find('user_1')
  // console.log({user_1})

  // R many
  // const users = await userModel.findMany({})
  // console.log(users)

  // R by index
  // console.log(await userModel.findByIndex('username', 'user_1'))
  // console.log(await userModel.findByIndex('info_test', '', {resolve: true}))

  // printKV(kv)
  kv.close()
})
