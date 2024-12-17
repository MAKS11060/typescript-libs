#!/usr/bin/env -S deno run -A --watch-hmr

import {encodeHex} from 'jsr:@std/encoding/hex'
import {ulid} from 'jsr:@std/ulid'
import {z} from 'zod'

// type CreateOptions<
//   //
//   S extends z.Schema,
//   P extends keyof z.input<S>,
//   T extends Exclude<keyof z.input<S>, P>
// > = {
//   /** `kv prefix` */
//   prefix: string
//   primaryKey: P
//   /** @default 'ulid'  */
//   primaryKeyType?: 'ulid' | (() => z.input<S>[P])
//   secondaryKeys: T[] | Exclude<keyof z.input<S>, P>[]
//   indexOptions?: {
//     [K in T]?: {
//       /** @default 'one'  */
//       relation?: 'one' | 'many'
//       transform?: (val: z.input<S>[K]) => z.input<S>[K]
//     }
//   }
//   /** @default 'kebab-case' */
//   indexNameStyle?: 'kebab-case' | 'camelCase' | 'snake_case'
// }

// type ModelOptions<
//   //
//   S extends z.Schema,
//   P extends keyof z.input<S>,
//   T extends z.input<S>
// > = CreateOptions<S, P, T>

type ModelOptions<
  //
  S extends z.Schema,
  PrimaryKey extends keyof z.input<S>,
  SecondaryKeys extends Exclude<keyof z.input<S>, PrimaryKey>
> = {
  /** `kv prefix` */
  prefix: string
  primaryKey: PrimaryKey
  /** @default 'ulid'  */
  primaryKeyType?: 'ulid' | (() => z.input<S>[PrimaryKey])
  secondaryKeys: SecondaryKeys[] | Exclude<keyof z.input<S>, PrimaryKey>[]
  indexOptions?: {
    [K in SecondaryKeys]?: {
      /** @default 'one'  */
      relation?: 'one' | 'many'
      transform?: (val: z.input<S>[K]) => z.input<S>[K]
    }
  }
  /** @default 'kebab-case' */
  indexNameStyle?: 'kebab-case' | 'camelCase' | 'snake_case'
}

type ModelCreateOptions<Key> = {
  /** Set `Primary` key */
  key?: Key
  /** override `AtomicOperation` for one transaction */
  op?: Deno.AtomicOperation
  /** expireIn in `milliseconds` */
  expireIn?: number
}

export const createModel = <
  S extends z.Schema ,
  PrimaryKey extends keyof z.input<S> ,
  // keys without primaryKey
  SecondaryKeys extends Exclude<keyof z.input<S>, PrimaryKey>
>(
  kv: Deno.Kv,
  schema: S,
  modelOptions: ModelOptions<S, PrimaryKey, SecondaryKeys>
) => {
  type Input = z.input<S>
  type InputWithoutKey = Omit<Input, PrimaryKey>
  type PrimaryKeyType = Input[PrimaryKey]
  type Output = z.output<S>

  // Default options
  let generateKey = ulid
  if (modelOptions.primaryKeyType === 'ulid') {
    modelOptions.primaryKeyType = ulid
  } else if (typeof modelOptions.primaryKeyType === 'function') {
    generateKey = modelOptions.primaryKeyType
  }

  const makeIndexKey = (key: Deno.KvKeyPart): Deno.KvKeyPart => {
    switch (modelOptions.indexNameStyle) {
      case 'camelCase':
        return `${modelOptions.prefix as string}${(
          key as string
        )[0].toUpperCase()}${(key as string).slice(1)}`
      case 'snake_case':
        return `${modelOptions.prefix as string}_${key as string}`
      case 'kebab-case':
      default:
        return `${modelOptions.prefix as string}-${key as string}`
    }
  }

  // Create
  const create = async (
    input: InputWithoutKey,
    options?: ModelCreateOptions<PrimaryKeyType>
  ) => {
    const key = options?.key ?? generateKey()
    const output = schema.parse({[modelOptions.primaryKey]: key, ...input})
    const op = options?.op ?? kv.atomic()

    op.set([modelOptions.prefix, key], output, options) // primary

    // update index
    for (const index of modelOptions.secondaryKeys as SecondaryKeys[]) {
      if (!output[index]) continue
      let value = output[index]

      // apply transform
      const indexOptions = modelOptions?.indexOptions?.[index] ?? {}
      if (indexOptions.transform) value = indexOptions.transform(value)

      const primaryId = output[modelOptions.primaryKey]

      // index relation
      indexOptions.relation ??= 'one'
      if (indexOptions.relation === 'one') {
        const newSecondaryKey = [makeIndexKey(index), value]
        op.set(newSecondaryKey, primaryId, options)
        op.check({key: newSecondaryKey, versionstamp: null})
      } else if (indexOptions.relation === 'many') {
        const newSecondaryKey = [makeIndexKey(index), value, primaryId]
        op.set(newSecondaryKey, null, options)
        op.check({key: newSecondaryKey, versionstamp: null})
      }
    }

    const res = await op.commit()
    if (!res.ok) {
      console.error(`%c[KV/Create]`, 'color: green', 'Error')
      throw new Error('Commit failed', {cause: 'duplicate detected'})
    }

    return output as Output
  }

  // Find
  const find = async (key: PrimaryKeyType) => {
    const res = await kv.get<Output>([modelOptions.prefix, key])
    return res.value
  }

  type FindByIndex = {
    // Resolve `object`
    <T extends SecondaryKeys>(
      indexKey: T,
      value: Output[T],
      options: {resolve: true}
    ): Promise<Output>
    // Get object `primary key`
    <T extends SecondaryKeys>(
      indexKey: T,
      value: Output[T],
      options?: {resolve?: false}
    ): Promise<Output[T]>
  }

  const findByIndex: FindByIndex = async (indexKey, value, options) => {
    // apply transform
    const indexOptions = modelOptions?.indexOptions?.[indexKey] ?? {}
    if (indexOptions.transform) value = indexOptions.transform(value)

    const prefix = makeIndexKey(indexKey)
    const key = [prefix, value] // 'user-username' 'index'

    if (indexOptions?.relation === 'many') {
      throw new Error("findByIndex not available for relation 'one'")
    }

    const indexRes = await kv.get<Output[SecondaryKeys]>(key)
    if (!indexRes.value) throw new Error(`Index "${key}" is undefined`)

    return options?.resolve ? find(indexRes.value) : indexRes.value
  }

  return {
    create,
    find,
    findByIndex,
  }
}

// TEST
const kv = await Deno.openKv(':memory:')

const smallID = () => encodeHex(crypto.getRandomValues(new Uint8Array(4)))

// SCHEMA
const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  nickname: z.string(),
  email: z.string().email(),
  sex: z.enum(['unknown', 'male', 'female']).default('unknown'),
  age: z.number().default(18),
})

const postSchema = z.object({
  id: z.string(),
  userId: z.string(),
  data: z.string(),
})

// MODEL
const userModel2 = createModel(kv, userSchema, {
  prefix: 'user2',
  primaryKey: 'id',
  secondaryKeys: ['username'],
  indexOptions: {
    username: {
    }
  }
})
const userModel = createModel(kv, userSchema, {
  prefix: 'user',
  primaryKey: 'id',
  secondaryKeys: ['username', 'email', 'sex', 'age'],
  primaryKeyType: () => 'user_' + smallID(),
  indexOptions: {
    username: {
      relation: 'one',
      transform: (username) => username.toLowerCase(),
    },
    email: {
      transform: (email) => {
        const [name, host] = email.split('@', 2)
        return [name, host.toLowerCase()].join('@')
      },
    },
    sex: {
      relation: 'many',
    },
    age: {
      relation: 'many',
    },
  },
})

const postModel = createModel(kv, postSchema, {
  prefix: 'post',
  primaryKey: 'id',
  secondaryKeys: ['userId'],
  primaryKeyType: () => 'post_' + smallID(),
  indexOptions: {
    userId: {
      // relation: 'one',
      relation: 'many',
    },
  },
})

//
const user1 = await userModel.create({
  username: 'MAKS1',
  nickname: 'MAKS',
  email: 'MAKS1@EXAMPLE.COM',
})
const user2 = await userModel.create({
  username: 'MAKS2',
  nickname: 'MAKS',
  email: 'MAKS2@EXAMPLE.COM',
})

const post1 = await postModel.create({
  userId: user1.id,
  data: '11',
})
const post2 = await postModel.create({
  userId: user1.id,
  data: '22',
})

// console.log(await userModel.find(user1.id))
// console.log(await userModel.findByIndex('username', 'maks1'))
// console.log(await userModel.findByIndex('username', 'maks1', {resolve: true}))
console.log(await userModel.findByIndex('age', 18, {resolve: true}))

console.log('KV List')
for await (const item of kv.list({prefix: []})) {
  console.log(item.key, '=>', item.value)
}
