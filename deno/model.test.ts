import {expect} from 'jsr:@std/expect/expect'
import {z} from 'zod'
import {createKvInstance} from './model.ts'

const idMap = new Map<string, number>()
const smallID = (key: string, start = 0) => {
  idMap.set(key, (idMap.get(key) ?? start) + 1)
  return `${key}_` + idMap.get(key)
}

// const schema = z.object({
//   id_Uint8Array: z.instanceof(Uint8Array),
//   id_string: z.string(),
//   id_number: z.number(),
//   id_bigint: z.bigint(),
//   id_boolean: z.boolean(),
//   id_symbol: z.symbol(),

//   id_maybe_Uint8Array: z.instanceof(Uint8Array).optional(),
//   id_maybe_string: z.string().optional(),
//   id_maybe_number: z.number().optional(),
//   id_maybe_bigint: z.bigint().optional(),
//   id_maybe_boolean: z.boolean().optional(),
//   id_maybe_symbol: z.symbol().optional(),

//   // id_union: z.union([z.string(), z.number()]),
//   id_union: z.union([z.string(), z.number(), z.null()]),
//   id_array: z.array(z.string(), z.number()),
//   id_null: z.null(),
// })

Deno.test('1', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const factory = createKvInstance(kv)

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
    email: z.string().email(),
    age: z.number().default(18),
    info: z.object({
      test: z.boolean(),
    }),
    // array: z.array(z.string()).optional(),
    // array_str: z.string().optional(),
    // array_str: z.string(),
  })

  const userModel = factory.model(userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => smallID('user'),
    index: {
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
      info: {
        test: true,
      },
    })
  }

  // await printKV(kv)

  // R
  // console.log(await userModel.find('user_1'))

  // R many
  // console.log(await userModel.findMany({}))

  // R by index
  // console.log(await userModel.findByIndex('age', 18, {}))
  // console.log(await userModel.findByIndex('info_test', '', {resolve: true}))

  // const usernameId = await userModel.findByIndex('username', 'user_1')
  // const ageIds = await userModel.findByIndex('age', 18)
  // console.log({usernameId, ageIds})

  // const userId = await userModel.findByIndex('username', 'user_1')
  // const usersIds = await userModel.findByIndex('age', 18)

  // const user = await userModel.findByIndex('username', 'user_1', {resolve: true})
  // const users = await userModel.findByIndex('age', 18, {resolve: true})
  // console.log({userId, usersIds, user, users})

  await t.step('update', async () => {
    const user = await userModel.update('user_1', {
      age: 17,
      info: {
        test: false,
      },
    })
    expect(user.id).toBe('user_1')
    expect(user.age).toBe(17)
    expect(user.info.test).toBe(false)
  })

  await t.step('update', async () => {
    const user = await userModel.update('user_2', (val) => {
      console.log({val})
      val.id = '1234'
      val.username = 'asdf'
    })
    console.log({user})
  })

  // printKV(kv)
  kv.close()
})
