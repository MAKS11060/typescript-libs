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

Deno.test('12', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const factory = createKvInstance(kv)

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
  })
  const model = factory.model(userSchema, {
    prefix: 'test',
    primaryKey: 'id',
    index: {
      name: {
        key: v => v.username
      }
    }
  })

  // model.findByIndex('name', '')
})

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
  for (let i = 1; i < 4; i++) {
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
  await t.step('find', async () => {
    const user = await userModel.find('user_1')
    expect(user).toBeDefined()
    expect(user?.id).toBe('user_1')
    expect(user?.username).toBe('user_1')
    expect(user?.nickname).toBe('nick_1')
    expect(user?.email).toBe('test@test1.com')
    expect(user?.age).toBe(18)
    expect(user?.info.test).toBe(true)
  })

  // R many
  await t.step('findMany', async () => {
    const users = await userModel.findMany({})
    expect(users).toBeDefined()
    expect(users.length).toBe(3)
    if (users) {
      const user = users.at(0)
      expect(user?.id).toBe('user_1')
      expect(user?.username).toBe('user_1')
      expect(user?.nickname).toBe('nick_1')
      expect(user?.email).toBe('test@test1.com')
      expect(user?.age).toBe(18)
      expect(user?.info.test).toBe(true)
    }
  })

  // R by index
  await t.step('findByIndex', async () => {
    const user_ids = await userModel.findByIndex('age', 18)
    expect(user_ids).toEqual(['user_1', 'user_2', 'user_3'])
  })

  await t.step('findByIndex resolve', async () => {
    const users = await userModel.findByIndex('age', 18, {resolve: true})
    expect(users).toEqual([
      {
        age: 18,
        email: 'test@test1.com',
        id: 'user_1',
        info: {
          test: true,
        },
        nickname: 'nick_1',
        username: 'user_1',
      },
      {
        age: 18,
        email: 'test@test2.com',
        id: 'user_2',
        info: {
          test: true,
        },
        nickname: 'nick_2',
        username: 'user_2',
      },
      {
        age: 18,
        email: 'test@test3.com',
        id: 'user_3',
        info: {
          test: true,
        },
        nickname: 'nick_3',
        username: 'user_3',
      },
    ])
  })

  // const usernameId = await userModel.findByIndex()
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

  await t.step('update val', async () => {
    const user = await userModel.update('user_2', (val) => {
      val.id = '1234'
      val.username = 'asdf'
    })
    expect(user.id).toBe('user_2')
    expect(user.username).toBe('asdf')
  })

  await t.step('update return', async () => {
    const user = await userModel.update('user_2', () => {
      return {
        nickname: '3',
      }
    })
    expect(user.nickname).toBe('3')
  })

  userModel.findByIndex('')

  // printKV(kv)
  kv.close()
})
