import { expect } from 'jsr:@std/expect/expect'
import { z } from 'zod/v4'
import { createModel } from './kv_model.ts'

Deno.test('Test 000000', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const schema = z.object({
    id: z.string(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
  })
})

Deno.test('Test 090345', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
    id_str: z.string(),
    id_u8: z.instanceof(Uint8Array),
  })

  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => 1,
  })
  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'username',
    primaryKeyType: () => '', // err
  })
  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id_str',
    primaryKeyType: () => '',
  })
  createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id_u8',
    primaryKeyType: () => crypto.getRandomValues(new Uint8Array(16)),
  })
})

Deno.test('Test 737423', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.int(),
    // id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
  })
  const model = createModel(kv, userSchema, {
    prefix: '',
    primaryKey: 'id',
    primaryKeyType: () => 1,
    index: {
      i1: {key: (value) => value.username},
      i2: {key: (value) => 123},
    },
  })

  await model.create({username: ''}, {key: 1})
  await model.create({username: ''}, {key: 1})

  await model.findByIndex('i1', '123')
  await model.findByIndex('i2', 1)

  await model.find(123)
})

Deno.test('Test 163078', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 0

  const userSchema = z.object({
    id: z.int(),
    username: z.string(),
    email: z.string().nullish().default(null),
    get friends() {
      return userSchema.array().optional()
    },
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => id++,
    index: {
      i1: {relation: 'one', key: (v) => v.username},
      i2: {relation: 'one', key: (v) => {}},
      i3: {relation: 'one', key: (v) => Math.random() > .5 ? undefined : v.id},
      i4: {key: (v) => {}},
      i5: {relation: 'many', key: (v) => {}},
      i6: {key: (v) => v.email},
      i7: {relation: 'many', key: (v) => v.friends?.map((v) => v.id)},
    },
  })

  await userModel.create({username: 'abc'}) satisfies z.infer<typeof userSchema>
  await userModel.find(1) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i1', '1') satisfies number | null
  await userModel.findByIndex('i1', '1', {resolve: false}) satisfies number | null
  await userModel.findByIndex('i1', '1', {resolve: true}) satisfies z.infer<typeof userSchema> | null

  await userModel.findByIndex('i2', undefined, {resolve: true}) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i3', 1, {resolve: true}) satisfies z.infer<typeof userSchema> | null

  await userModel.findByIndex('i3', undefined, {resolve: true}) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i3', null, {resolve: true}) satisfies z.infer<typeof userSchema> | null
  await userModel.findByIndex('i3', (() => {})(), {resolve: true}) satisfies z.infer<typeof userSchema> | null

  await userModel.findByIndex('i4', null) satisfies number | null
  await userModel.findByIndex('i5', undefined) satisfies number[]
  await userModel.findByIndex('i6', '1') satisfies number | null
  await userModel.findByIndex('i7', 1) satisfies number[] | null
})

Deno.test('Test 163071 create', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string().nullish().default(null),
    get friends() {
      return userSchema.array().optional()
    },
  })
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: 'uuid7',
    index: {
      username: {relation: 'one', key: (v) => v.username},
      email: {key: (v) => v.email},
      friends: {relation: 'many', key: (v) => v.friends?.map((v) => v.id)},
    },
  })

  await userModel.create({username: 'abc'}) satisfies z.infer<typeof userSchema>

  const user1 = await userModel.findByIndex('username', 'abc', {resolve: true})
  if (!user1) throw new Error('findByIndex user1 not found')
  expect(user1.id).toBeTruthy()
  expect(user1.email).toBe(null)
  expect(user1.username).toBe('abc')

  const user2 = await userModel.create({
    username: 'user2',
    email: 'user2@example.com',
    friends: [user1],
  })
  const user3 = await userModel.create({
    username: 'user3',
    email: 'user3@example.com',
    friends: [user2, user1],
  })

  // printKV(kv)
})

Deno.test('Test 448353 create(transaction)', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.username.toLowerCase()},
    },
  })

  const op = model.atomic()
  for (let i = 0; i < 2; i++) {
    model.create({username: `user${i}`, age: 18}, {op, transaction: true})
  }
  await model.commit(op)

  const list = await model.findMany()
  expect(list).toEqual([
    {id: '1', username: 'user0', age: 18},
    {id: '2', username: 'user1', age: 18},
  ])
})

Deno.test('Test 235235 find', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  const user1 = await model.create({username: 'user1', age: 18})
  const user2 = await model.create({username: 'user2', age: 18})

  expect(await model.find(user1.id)).toEqual({id: '1', username: 'user1', age: 18})
  expect(await model.find(user2.id)).toEqual({id: '2', username: 'user2', age: 18})
  expect(await model.find('none')).toEqual(null)
})

Deno.test('Test 448354 findMany', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.username.toLowerCase()},
    },
  })

  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 17})
  await model.create({username: 'user4', age: 19})
  await model.create({username: 'user5', age: 10})

  // console.log(await model.findMany())
  const userList1 = await model.findMany({limit: 2})

  const lastId = userList1.at(-1)?.id! // '2'
  const userList2 = await model.findMany({limit: 2, offset: lastId})

  const lastId2 = userList2.at(-1)?.id! // '4'
  const userList3 = await model.findMany({limit: 2, offset: lastId2})

  expect(userList1).toEqual([
    {id: '1', username: 'user1', age: 18},
    {id: '2', username: 'user2', age: 18},
  ])
  expect(userList2).toEqual([
    {id: '3', username: 'user3', age: 17},
    {id: '4', username: 'user4', age: 19},
  ])
  expect(userList3).toEqual([
    {id: '5', username: 'user5', age: 10},
  ])

  const userListEmpty = await model.findMany({limit: 2, offset: '5'})
  expect(userListEmpty).toEqual([])
})

Deno.test('Test 499237 findByIndex', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 18})
  await model.create({username: 'user4', age: 17})
  await model.create({username: 'user5', age: 19})

  expect(await model.findByIndex('username', 'user1')).toEqual('1')
  expect(await model.findByIndex('username', 'user1', {resolve: true})).toEqual({id: '1', username: 'user1', age: 18})

  expect(await model.findByIndex('username', 'none')).toEqual(null)
  expect(await model.findByIndex('username', 'none', {resolve: true})).toEqual(null)

  expect(await model.findByIndex('age', 18)).toEqual(['1', '2', '3'])
  expect(await model.findByIndex('age', 17, {resolve: true})).toEqual([
    {id: '4', username: 'user4', age: 17},
  ])

  expect(await model.findByIndex('age', 100)).toEqual([])
  expect(await model.findByIndex('age', 100, {resolve: true})).toEqual([])
})

Deno.test('Test 453253 update', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  const user = await model.create({username: 'user1', age: 18})
  expect(user).toEqual({id: '1', username: 'user1', age: 18})

  const updata1 = await model.update(user.id, {age: 19})
  console.log({updata1})
  expect(updata1).toEqual({id: '1', username: 'user1', age: 19})

  const updata2 = await model.update(user.id, (v) => {
    v.age = 20
  })
  expect(updata2).toEqual({id: '1', username: 'user1', age: 20})

  const updata3 = await model.update(user.id, (v) => {
    return {
      id: 'new id', // ignore
      age: 21,
    }
  })
  expect(updata3).toEqual({id: '1', username: 'user1', age: 21})
})

Deno.test('Test 399377 delete', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 18})

  //
  await model.delete('1')

  const op = model.atomic()
  await model.delete('2', {op, transaction: true})
  await model.delete('3', {op})

  const userList = await model.findMany()
  expect(userList).toEqual([])
})

Deno.test('Test 737649 deleteByIndex', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = createModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`.padStart(2, '0'),
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })

  //
  await model.create({username: 'user1', age: 18})
  await model.create({username: 'user2', age: 18})
  await model.create({username: 'user3', age: 18})
  await model.create({username: 'user4', age: 17})
  await model.create({username: 'user5', age: 19})

  await model.deleteByIndex('username', 'user2')
  expect(await model.findMany()).toEqual([
    {id: '01', username: 'user1', age: 18},
    {id: '03', username: 'user3', age: 18},
    {id: '04', username: 'user4', age: 17},
    {id: '05', username: 'user5', age: 19},
  ])

  await model.deleteByIndex('age', 18)
  expect(await model.findMany()).toEqual([
    {id: '04', username: 'user4', age: 17},
    {id: '05', username: 'user5', age: 19},
  ])

  for (let i = 5; i < 60; i++) {
    await model.create({username: `user${i}`, age: 18})
  }

  await model.deleteByIndex('age', 18)
  expect(await model.findMany()).toEqual([
    {id: '04', username: 'user4', age: 17},
    {id: '05', username: 'user5', age: 19},
    {id: '56', username: 'user55', age: 18},
    {id: '57', username: 'user56', age: 18},
    {id: '58', username: 'user57', age: 18},
    {id: '59', username: 'user58', age: 18},
    {id: '60', username: 'user59', age: 18},
  ])
})

// import { expect } from 'jsr:@std/expect/expect'
// import * as v from 'npm:valibot'
// import { z } from 'zod'
// import { printKV } from './kv_helper.ts'
// import { kvModel } from './kv_model.ts'
// import { kvProvider } from './mod.ts'

// const smallIdInit = () => {
//   const idMap = new Map<string, number>()
//   const smallID = (key: string, start = 0) => {
//     idMap.set(key, (idMap.get(key) ?? start) + 1)
//     return `${key}_` + idMap.get(key)
//   }
//   return {smallID}
// }

// Deno.test('kvModel', async (t) => {
//   const kv = await Deno.openKv(':memory:')

//   await t.step('ValibotSchema', async () => {
//     const kv = await Deno.openKv(':memory:')
//     const valibotSchema = v.object({
//       key1: v.string(),
//       key2: v.number(),
//       keys: v.array(v.string()),
//     })

//     const model = kvModel(kv, valibotSchema, {
//       prefix: 'test',
//       primaryKey: 'key1',
//       index: {
//         test1: {relation: 'one', key: (v) => v.key1},
//         test2: {relation: 'one', key: (v) => v.key2},
//         test3: {relation: 'many', key: (v) => v.keys},
//       },
//     })

//     const item1 = await model.create({key2: 1, keys: ['a', 'b']})
//     const item2 = await model.create({key2: 2, keys: ['c', 'b']})

//     const test1 = await model.findByIndex('test1', item1.key1, {resolve: true})
//     expect(test1).toEqual(item1)

//     // const test2 = await model.findByIndex('test1', '2')
//     // console.log(test2)
//     // const test3 = await model.findByIndex('test3', 'b')
//     // console.log(test3)

//     kv.close()
//   })

//   await t.step('ZodSchema', async () => {
//     const userSchema = z.object({
//       id: z.string(),
//       username: z.string(),
//       flags: z.array(z.string()),
//     })
//     const userModel = kvModel(kv, userSchema, {
//       prefix: 'user',
//       primaryKey: 'id',
//       index: {
//         username: {
//           relation: 'one',
//           key: (user) => user.username.toLowerCase(),
//         },
//         role: {
//           relation: 'many',
//           key: (user) => user.flags,
//         },
//       },
//     })

//     await userModel.create({username: 'root', flags: ['root', 'admin', 'user']})
//     await userModel.create({username: 'admin', flags: ['admin', 'user']})
//     await userModel.create({username: 'bot1', flags: ['bot']})
//     await userModel.create({username: 'bot2', flags: ['bot']})
//     await userModel.create({username: 'bot3', flags: ['bot']})
//     await userModel.create({username: 'user1', flags: ['user']})
//     await userModel.create({username: 'user2', flags: ['user']})
//     await userModel.create({username: 'user3', flags: ['user', 'admin']})

//     const op = userModel.atomic()
//     const user2 = userModel.create({username: 'user10', flags: ['user']}, {op, transaction: true})
//     const user3 = await userModel.create({username: 'user11', flags: ['user']}, {op})

//     const users = await userModel.findByIndex('role', 'user')
//     console.log(users)

//     const user = await userModel.findByIndex('username', 'user1', {resolve: true})
//     console.log(user)

//     {
//       const user = await userModel.find('user1')
//       // console.log(user)
//     }
//     {
//       const users = await userModel.findMany({})
//       console.log(users)
//     }
//   })

//   kv.close()
// })

// Deno.test('1', async (t) => {
//   const kv = await Deno.openKv(':memory:')
//   const factory = kvProvider(kv)

//   const schema = z.object({
//     id_Uint8Array: z.instanceof(Uint8Array),
//     id_string: z.string(),
//     id_number: z.number(),
//     id_bigint: z.bigint(),
//     id_boolean: z.boolean(),
//     id_symbol: z.symbol(),

//     id_maybe_Uint8Array: z.instanceof(Uint8Array).optional(),
//     id_maybe_string: z.string().optional(),
//     id_maybe_number: z.number().optional(),
//     id_maybe_bigint: z.bigint().optional(),
//     id_maybe_boolean: z.boolean().optional(),
//     id_maybe_symbol: z.symbol().optional(),

//     id_union: z.union([z.string(), z.number(), z.null()]),
//     id_array: z.array(z.string(), z.number()),
//     id_null: z.null(),
//   })

//   const model = factory.model(schema, {
//     prefix: 'test',
//     primaryKey: 'id_bigint',
//     index: {},
//   })

//   kv.close()
// })

// Deno.test('2', async (t) => {
//   const {smallID} = smallIdInit()
//   const kv = await Deno.openKv(':memory:')
//   const factory = kvProvider(kv)

//   const userSchema = z.object({
//     id: z.string(),
//     username: z.string(),
//     nickname: z.string(),
//     email: z.string().email(),
//     age: z.number().default(18),
//     info: z.object({
//       test: z.boolean(),
//     }),
//   })

//   const userModel = factory.model(userSchema, {
//     prefix: 'user',
//     primaryKey: 'id',
//     primaryKeyType: () => smallID('user'),
//     index: {
//       username: {
//         relation: 'one',
//         key: ({username}) => username.toLowerCase(),
//       },
//       email: {
//         relation: 'one',
//         key: ({email}) => {
//           const [name, host] = email.split('@', 2)
//           return [name, host.toLowerCase()].join('@')
//         },
//       },
//       age: {
//         relation: 'many',
//         key: ({age}) => age,
//       },
//       info_test: {
//         relation: 'many',
//         key: ({info}) => info.test,
//       },
//     },
//   })

//   // C
//   for (let i = 1; i < 4; i++) {
//     await userModel.create({
//       username: `user_${i}`,
//       nickname: `nick_${i}`,
//       email: `test@test${i}.com`,
//       info: {
//         test: true,
//       },
//     })
//   }

//   // R
//   await t.step('find', async () => {
//     const user = await userModel.find('user_1')
//     expect(user).toBeDefined()
//     expect(user?.id).toBe('user_1')
//     expect(user?.username).toBe('user_1')
//     expect(user?.nickname).toBe('nick_1')
//     expect(user?.email).toBe('test@test1.com')
//     expect(user?.age).toBe(18)
//     expect(user?.info.test).toBe(true)
//   })

//   // R many
//   await t.step('findMany', async () => {
//     const users = await userModel.findMany({})
//     expect(users).toBeDefined()
//     expect(users.length).toBe(3)
//     if (users) {
//       const user = users.at(0)
//       expect(user?.id).toBe('user_1')
//       expect(user?.username).toBe('user_1')
//       expect(user?.nickname).toBe('nick_1')
//       expect(user?.email).toBe('test@test1.com')
//       expect(user?.age).toBe(18)
//       expect(user?.info.test).toBe(true)
//     }
//   })

//   // R by index
//   await t.step('findByIndex', async () => {
//     const user_ids = await userModel.findByIndex('age', 18)
//     expect(user_ids).toEqual(['user_1', 'user_2', 'user_3'])
//   })

//   await t.step('findByIndex resolve', async () => {
//     const users = await userModel.findByIndex('age', 18, {resolve: true})
//     expect(users).toEqual([
//       {
//         age: 18,
//         email: 'test@test1.com',
//         id: 'user_1',
//         info: {
//           test: true,
//         },
//         nickname: 'nick_1',
//         username: 'user_1',
//       },
//       {
//         age: 18,
//         email: 'test@test2.com',
//         id: 'user_2',
//         info: {
//           test: true,
//         },
//         nickname: 'nick_2',
//         username: 'user_2',
//       },
//       {
//         age: 18,
//         email: 'test@test3.com',
//         id: 'user_3',
//         info: {
//           test: true,
//         },
//         nickname: 'nick_3',
//         username: 'user_3',
//       },
//     ])
//   })

//   // const usernameId = await userModel.findByIndex()
//   // const ageIds = await userModel.findByIndex('age', 18)
//   // console.log({usernameId, ageIds})

//   // const userId = await userModel.findByIndex('username', 'user_1')
//   // const usersIds = await userModel.findByIndex('age', 18)

//   // const user = await userModel.findByIndex('username', 'user_1', {resolve: true})
//   // const users = await userModel.findByIndex('age', 18, {resolve: true})
//   // console.log({userId, usersIds, user, users})

//   await t.step('update', async () => {
//     const user = await userModel.update('user_1', {
//       age: 17,
//       info: {
//         test: false,
//       },
//     })
//     expect(user.id).toBe('user_1')
//     expect(user.age).toBe(17)
//     expect(user.info.test).toBe(false)
//   })

//   await t.step('update val', async () => {
//     const user = await userModel.update('user_2', (val) => {
//       val.id = '1234'
//       val.username = 'asdf'
//     })
//     expect(user.id).toBe('user_2')
//     expect(user.username).toBe('asdf')
//   })

//   await t.step('update return', async () => {
//     const user = await userModel.update('user_2', () => {
//       return {
//         nickname: '3',
//       }
//     })
//     expect(user.nickname).toBe('3')
//   })

//   await t.step('updateByIndex', async () => {
//     const user_id = await userModel.findByIndex('username', 'user_1')
//     // userModel.update(user_id, {})
//   })

//   await t.step('remove', async () => {
//     const isDelete = await userModel.remove('user_1')
//     expect(isDelete).toBe(true)
//   })

//   await t.step('removeByIndex', async () => {
//     const isDelete = await userModel.removeByIndex('age', 18)
//     expect(isDelete).toBe(true)
//   })

//   // await printKV(kv)
//   kv.close()
// })

// Deno.test({name: '3', ignore: true}, async (t) => {
//   const {smallID} = smallIdInit()
//   const kv = await Deno.openKv(':memory:')
//   const factory = kvProvider(kv)

//   const userSchema = z.object({
//     id: z.string(),
//     username: z.string(),
//     nickname: z.string(),
//   })
//   const userModel = factory.model(userSchema, {
//     prefix: 'user',
//     primaryKey: 'id',
//     primaryKeyType: () => smallID('user'),
//     index: {
//       username: {
//         relation: 'one',
//         key: ({username}) => username.toLowerCase(),
//       },
//       str: {
//         relation: 'many',
//         key: ({username}) => username.toLowerCase(),
//       },
//       num: {
//         relation: 'many',
//         key: ({username}) => 1,
//       },
//       id: {
//         key: ({username}) => 1,
//       },
//     },
//   })

//   const user = await userModel.create({
//     username: '1',
//     nickname: '1',
//   })
//   // console.log(user)
//   // console.log(await userModel.remove(user.id))
//   // await userModel.remove(user.id)
//   // userModel.removeByIndex('test', '123')

//   const a = await userModel.findByIndex('id', 1)
//   const b = await userModel.findByIndex('num', 1)
//   const c = await userModel.findByIndex('str', '1')
//   const d = await userModel.findByIndex('username', 'u')

//   // await printKV(kv)
//   kv.close()
// })

// Deno.test('4', async (t) => {
//   const {smallID} = smallIdInit()
//   const kv = await Deno.openKv(':memory:')
//   const factory = kvProvider(kv)

//   const userSchema = z.object({
//     id: z.string(),
//     text: z.string(),
//     flag: z.number(),
//   })
//   const userModel = factory.model(userSchema, {
//     prefix: 'post',
//     primaryKey: 'id',
//     primaryKeyType: () => smallID('post'),
//     index: {
//       text: {
//         key: ({text}) => text,
//       },
//       flag: {
//         relation: 'many',
//         key: ({flag}) => flag,
//       },
//     },
//   })

//   // const post_1 = await userModel.create({text: '1', flag: 1})
//   // const post_2 = await userModel.create({text: '2', flag: 1})
//   // for (let i = 3; i < 60+6; i++) {
//   //   await userModel.create({text: `${i}`, flag: 2})
//   // }
//   // for (let i = 6; i < 9; i++) {
//   //   await userModel.create({text: `${i}`, flag: 3})
//   // }

//   // console.log(await userModel.remove(post_1.id))
//   // console.log(await userModel.removeByIndex('text', post_2.text))
//   // console.log(await userModel.removeByIndex('flag', 2))

//   for (let i = 0; i < 55; i++) {
//     await userModel.create({text: `${i + 1}`, flag: 2})
//   }
//   console.log(await userModel.removeByIndex('flag', 2))

//   await userModel.index.wipe()
//   await userModel.index.create()

//   await printKV(kv)
//   kv.close()
// })

// Deno.test('5', async (t) => {
//   const {smallID} = smallIdInit()
//   const kv = await Deno.openKv(':memory:')
//   const factory = kvProvider(kv)

//   const userSchema = z.object({
//     id: z.string(),
//     text: z.string(),
//     flag: z.number(),
//     role: z.array(z.string()),
//   })
//   const userModel = factory.model(userSchema, {
//     prefix: 'post',
//     primaryKey: 'id',
//     primaryKeyType: () => smallID('post'),
//     index: {
//       text: {
//         key: ({text}) => text,
//       },
//       flag: {
//         relation: 'many',
//         key: ({flag}) => flag,
//       },
//       role: {
//         relation: 'many',
//         key: (v) => v.role,
//       },
//     },
//   })

//   for (let i = 0; i < 1; i++) {
//     await userModel.create({text: `${i + 1}`, flag: 2, role: ['admin', 'user']})
//   }

//   await userModel.update('post_1', {role: ['mod', 'user']}, {force: true})
//   // await userModel.remove('post_1')

//   // await printKV(kv)
//   kv.close()
// })

// Deno.test('kvModel 2', async (t) => {
//   const kv = await Deno.openKv(':memory:')
//   const userSchema = z.object({
//     id: z.string(),
//     username: z.string(),
//     nickname: z.string(),
//     email: z.string().email().optional(),
//     role: z.array(z.string()).default([]),
//   })

//   const userModel = kvModel(kv, userSchema, {
//     prefix: 'user',
//     primaryKey: 'id',
//     index: {
//       username: {
//         key: (v) => v.username.toLowerCase(),
//       },
//       email: {
//         key: (v) => {
//           if (!v.email) return []
//           const [name, domain] = v?.email?.split('@', 2)!
//           return [name, domain.toLowerCase()].join('@')
//         },
//       },
//       role: {
//         relation: 'many',
//         key: (v) => v.role,
//       },
//     },
//   })

//   await t.step('Create', async () => {
//     await userModel.create({username: `admin`, nickname: `admin`, role: ['admin', 'user']})
//     for (let i = 0; i < 5; i++) {
//       await userModel.create({username: `user${i}`, nickname: `user${i}`, role: ['user']})
//     }
//   })

//   const user1 = await userModel.findByIndex('username', 'user1')
//   // if (user1) await userModel.update(user1, {role: ['abc', 'admin']})
//   if (user1) {
//     await userModel.update(user1, () => {
//       return {role: ['abc', 'admin']}
//     })
//   }

//   // await printKV(kv)
//   kv.close()
// })
