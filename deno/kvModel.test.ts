#!/usr/bin/env -S deno test -A --watch

import {expect} from 'jsr:@std/expect'
import {z} from 'zod'
import {createModel} from './kvModel.ts'

// const smallID = () => encodeHex(crypto.getRandomValues(new Uint8Array(4)))
const idMap = new Map<string, number>()
const smallID = (key: string, start = 0) => {
  idMap.set(key, (idMap.get(key) ?? start) + 1)
  return `${key}_` + idMap.get(key)
}

// TEST
Deno.test('kvModel', async (t) => {
  using kv = await Deno.openKv(':memory:')

  // SCHEMA
  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
    email: z.string().email(),
    age: z.number().default(18),
  })

  const postSchema = z.object({
    id: z.string(),
    userId: z.string(),
    data: z.string(),
  })

  // MODEL
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    secondaryKeys: ['username', 'email', 'age'],
    primaryKeyType: () => smallID('user'),
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
      age: {
        relation: 'many',
      },
    },
  })

  const postModel = createModel(kv, postSchema, {
    prefix: 'post',
    primaryKey: 'id',
    secondaryKeys: ['userId'],
    primaryKeyType: () => smallID('post'),
    indexOptions: {
      userId: {
        relation: 'many',
      },
    },
  })

  // DATA
  const expectedUser1 = {
    id: 'user_1',
    username: 'User1',
    nickname: 'User1',
    email: 'User1@EXAMPLE.COM',
    age: 18,
  }

  await t.step('Create', async () => {
    const user1 = await userModel.create({
      username: 'User1',
      nickname: 'User1',
      email: 'User1@EXAMPLE.COM',
    })
    expect(expectedUser1).toEqual(user1)

    for (let i = 2; i < 5; i++) {
      await userModel.create({
        username: `User${i}`,
        nickname: `User${i}`,
        email: `User${i}@EXAMPLE.COM`,
      })
    }

    // Post
    const post1 = await postModel.create({
      userId: expectedUser1.id,
      data: '1111',
    })
    const post2 = await postModel.create({
      userId: expectedUser1.id,
      data: '1111',
    })
  })

  await t.step('Read', async (t) => {
    await t.step('find', async () => {
      const user = await userModel.find('user_1')
      expect(expectedUser1).toEqual(user)
    })

    await t.step('find null', async () => {
      const user = await userModel.find('')
      expect(user).toBeNull()
    })

    await t.step('findByIndex', async () => {
      const user = await userModel.findByIndex('username', 'User1')
      expect(user).toBe('user_1')
    })

    await t.step('findByIndex resolve', async () => {
      const user = await userModel.findByIndex('username', 'User1', {
        resolve: true,
      })
      expect(expectedUser1).toEqual(user)
    })

    await t.step('findManyByIndex', async () => {
      const user = await userModel.findManyByIndex('age', 18, {limit: 1})
      expect(user).toEqual(['user_1'])
    })

    await t.step('findManyByIndex resolve', async () => {
      const user = await userModel.findManyByIndex('age', 18, {
        resolve: true,
        limit: 1,
      })
      expect(user).toEqual([expectedUser1])
    })

    await t.step('findManyByIndex offset', async () => {
      const user = await userModel.findManyByIndex('age', 18, {
        limit: 1,
        offset: 'user_1',
      })
      expect(user).toEqual(['user_2'])
    })

    await t.step('findManyByIndex offset + reverse', async () => {
      const user = await userModel.findManyByIndex('age', 18, {
        limit: 1,
        reverse: true,
        offset: 'user_3',
      })
      expect(user).toEqual(['user_2'])
    })
  })

  await t.step('Update', async (t) => {
    const post1 = await postModel.update('post_1', {data: '2222'})
    expect(post1).toEqual({
      id: 'post_1',
      userId: 'user_1',
      data: '2222',
    })
    const post2 = await postModel.update('post_2', (v) => {
      return {data: '2222'}
    })
    expect(post2).toEqual({
      id: 'post_2',
      userId: 'user_1',
      data: '2222',
    })
  })

  await t.step('Delete', async (t) => {
    await postModel.remove('post_1')
    await postModel.remove('post_2')

    await t.step('Transaction', async () => {
      const op = userModel.atomics()
      await userModel.remove('user_1', {op, transaction: true})
      await userModel.remove('user_2', {op, transaction: true})
      await userModel.remove('user_3', {op, transaction: true})
      await userModel.remove('user_4', {op})
    })
  })

  // console.log('%cKV List', 'color: orange')
  // for await (const item of kv.list({prefix: []})) {
  //   console.log(item.key, '=>', item.value)
  // }
})

Deno.test('kvModel optional', async (t) => {
  using kv = await Deno.openKv(':memory:')

  // SCHEMA
  const userSchema = z.object({
    id: z.string(),
    username: z.string(),
    nickname: z.string(),
    email: z.string().email().optional(),
    age: z.number().default(18),
  })

  // MODEL
  const userModel = createModel(kv, userSchema, {
    prefix: 'user',
    primaryKey: 'id',
    secondaryKeys: ['username', 'email', 'age'],
    primaryKeyType: () => smallID('user2'),
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
      age: {
        relation: 'many',
      },
    },
  })

  const user1 = await userModel.create({
    username: 'User1',
    nickname: 'User1',
    email: 'User1@EXAMPLE.COM',
  })
  await userModel.create({
    username: 'User2',
    nickname: 'User2',
    email: 'User2@EXAMPLE.COM',
  })
  await userModel.update('user2_1', {
    username: 'User3',
    nickname: 'User3',
    email: 'User3@EXAMPLE.COM',
  })

  await userModel.wipeIndex()
  await userModel.indexCreate()

  console.log('%cKV List', 'color: orange')
  for await (const item of kv.list({prefix: []})) {
    console.log(item.key, '=>', item.value)
  }
})
