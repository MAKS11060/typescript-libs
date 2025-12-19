import {expect} from '@std/expect/expect'
import {z} from 'zod'
import {indexManager, kvModel} from './kv_model.ts'

Deno.test('Test 000000', async (t) => {
  using kv = await Deno.openKv(':memory:')

  const schema = z.object({
    id: z.string(),
  })
  const model = kvModel(kv, schema, {
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

  kvModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => 1,
  })
  kvModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'username',
    primaryKeyType: () => '', // err
  })
  kvModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id_str',
    primaryKeyType: () => '',
  })
  kvModel(kv, userSchema, {
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
  const model = kvModel(kv, userSchema, {
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
  const userModel = kvModel(kv, userSchema, {
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
  const userModel = kvModel(kv, userSchema, {
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
  const model = kvModel(kv, schema, {
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
  const model = kvModel(kv, schema, {
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
  const model = kvModel(kv, schema, {
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
  const model = kvModel(kv, schema, {
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
  const model = kvModel(kv, schema, {
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
  const model = kvModel(kv, schema, {
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
  const model = kvModel(kv, schema, {
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

Deno.test('Test 518845 indexManager', async (t) => {
  using kv = await Deno.openKv(':memory:')
  let id = 1

  const schema = z.object({
    id: z.string(),
    username: z.string(),
    age: z.int().positive(),
  })
  const model = kvModel(kv, schema, {
    prefix: 'user',
    primaryKey: 'id',
    primaryKeyType: () => `${id++}`,
    index: {
      username: {key: (v) => v.username.toLowerCase()},
      age: {relation: 'many', key: (v) => v.age},
    },
  })
  const index = indexManager(model)

  for (let i = 0; i < 3; i++) {
    await model.create({username: `user${i}`, age: 18})
  }

  await index.delete()
  expect(await model.findByIndex('age', 18)).toEqual([])

  await index.create()
  expect(await model.findByIndex('age', 18)).toEqual(['1', '2', '3'])
})
