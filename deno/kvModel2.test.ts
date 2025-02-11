import {expect} from 'jsr:@std/expect/expect'
import {z} from 'zod'
import {printKV} from './kvLib.ts'
import {createKvModel} from './kvModel2.ts'

const smallIdInit = () => {
  const idMap = new Map<string, number>()
  const smallID = (key: string, start = 0) => {
    idMap.set(key, (idMap.get(key) ?? start) + 1)
    return `${key}_` + idMap.get(key)
  }
  return {smallID}
}

Deno.test('1', async (t) => {
  const kv = await Deno.openKv(':memory:')
  const factory = createKvModel(kv)

  const schema = z.object({
    id_Uint8Array: z.instanceof(Uint8Array),
    id_string: z.string(),
    id_number: z.number(),
    id_bigint: z.bigint(),
    id_boolean: z.boolean(),
    id_symbol: z.symbol(),

    id_maybe_Uint8Array: z.instanceof(Uint8Array).optional(),
    id_maybe_string: z.string().optional(),
    id_maybe_number: z.number().optional(),
    id_maybe_bigint: z.bigint().optional(),
    id_maybe_boolean: z.boolean().optional(),
    id_maybe_symbol: z.symbol().optional(),

    id_union: z.union([z.string(), z.number(), z.null()]),
    id_array: z.array(z.string(), z.number()),
    id_null: z.null(),
  })

  const model = factory.model(schema, {
    prefix: 'test',
    primaryKey: 'id_bigint',
    index: {},
  })

  kv.close()
})

Deno.test('2', async (t) => {
  const {smallID} = smallIdInit()
  const kv = await Deno.openKv(':memory:')
  const factory = createKvModel(kv)

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

  await t.step('updateByIndex', async () => {
    const user_id = await userModel.findByIndex('username', 'user_1')
    // userModel.update(user_id, {})
  })

  await t.step('remove', async () => {
    const isDelete = await userModel.remove('user_1')
    expect(isDelete).toBe(true)
  })

  await t.step('removeByIndex', async () => {
    const isDelete = await userModel.removeByIndex('age', 18)
    expect(isDelete).toBe(true)
  })

  await printKV(kv)
  kv.close()
})

Deno.test('3', async (t) => {
  const {smallID} = smallIdInit()
  const kv = await Deno.openKv(':memory:')
  const factory = createKvModel(kv)

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
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
      str: {
        relation: 'many',
        key: ({username}) => username.toLowerCase(),
      },
      num: {
        relation: 'many',
        key: ({username}) => 1,
      },
      id: {
        key: ({username}) => 1,
      },
    },
  })

  const user = await userModel.create({
    username: '1',
    nickname: '1',
  })
  console.log(user)
  console.log(await userModel.remove(user.id))

  // userModel.removeByIndex('test', '123')

  const a = await userModel.findByIndex('id', 1)
  const b = await userModel.findByIndex('num', 1)
  const c = await userModel.findByIndex('str', '1')
  const d = await userModel.findByIndex('username', 'u')

  await printKV(kv)
  kv.close()
})

Deno.test('4', async (t) => {
  const {smallID} = smallIdInit()
  const kv = await Deno.openKv(':memory:')
  const factory = createKvModel(kv)

  const userSchema = z.object({
    id: z.string(),
    text: z.string(),
    flag: z.number(),
  })
  const userModel = factory.model(userSchema, {
    prefix: 'post',
    primaryKey: 'id',
    primaryKeyType: () => smallID('post'),
    index: {
      text: {
        key: ({text}) => text,
      },
      flag: {
        relation: 'many',
        key: ({flag}) => flag,
      },
    },
  })

  // const post_1 = await userModel.create({text: '1', flag: 1})
  // const post_2 = await userModel.create({text: '2', flag: 1})
  // for (let i = 3; i < 60+6; i++) {
  //   await userModel.create({text: `${i}`, flag: 2})
  // }
  // for (let i = 6; i < 9; i++) {
  //   await userModel.create({text: `${i}`, flag: 3})
  // }

  // console.log(await userModel.remove(post_1.id))
  // console.log(await userModel.removeByIndex('text', post_2.text))
  // console.log(await userModel.removeByIndex('flag', 2))

  for (let i = 0; i < 55; i++) {
    await userModel.create({text: `${i + 1}`, flag: 2})
  }
  console.log(await userModel.removeByIndex('flag', 2))

  await userModel.index.wipe()
  await userModel.index.create()

  await printKV(kv)
  kv.close()
})

Deno.test('5', async (t) => {
  const {smallID} = smallIdInit()
  const kv = await Deno.openKv(':memory:')
  const factory = createKvModel(kv)

  const userSchema = z.object({
    id: z.string(),
    text: z.string(),
    flag: z.number(),
    role: z.array(z.string()),
  })
  const userModel = factory.model(userSchema, {
    prefix: 'post',
    primaryKey: 'id',
    primaryKeyType: () => smallID('post'),
    index: {
      text: {
        key: ({text}) => text,
      },
      flag: {
        relation: 'many',
        key: ({flag}) => flag,
      },
      role: {
        relation: 'many',
        key: (v) => v.role,
      },
    },
  })

  for (let i = 0; i < 1; i++) {
    await userModel.create({text: `${i + 1}`, flag: 2, role: ['admin', 'user']})
  }

  await userModel.update('post_1', {role: ['mod', 'user']}, {force: true})

  await printKV(kv)
  kv.close()
})
