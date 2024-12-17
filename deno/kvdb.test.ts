#!/usr/bin/env -S deno test -A --watch

import {createModel} from '@kv'
import 'jsr:@std/dotenv/load'
import {z} from 'zod'

Deno.test('Create', async (t) => {
  const kv = await Deno.openKv(':memory:')

  const schema = z.object({
    id: z.string(),
    name: z.string(),
    name2: z.string(),
    val: z.string(),
  })

  const testModel = createModel(kv, schema, {
    prefix: 'test',
    primaryKey: 'id',
    index: ['name', 'name2'],
    indexOptions: {
      name2: {unique: true},
    },
  })

  const model = testModel.create({
    name: '111',
    name2: '111',
    val: '',
  })

  await model.commit()

  await t.step('update', async () => {
    await testModel.update(model.data.id, {
      name: '222',
      name2: '222'
    })
  })

  for await (const item of kv.list({prefix: []})) console.log(item.key, '=>', item.value)

  kv.close()
})

/* import {expect} from 'jsr:@std/expect/expect'
import {userModel} from '../models/user.ts'
import {kv} from './kv.ts'
import {kvEntries} from './kvLib.ts'

Deno.test('Create', async (t) => {
  const newUser = userModel.create({username: 'test', nickname: 'Test'})
  const res = await newUser.commit()
  if (!res.ok) throw new Error('Create user error')

  await t.step('Update', async () => {
    const updatedUser = await userModel.update(res.value.id, {
      username: 'Test',
      nickname: 'Test2',
      email: 'test@gmail.com',
    })

    expect(updatedUser.username).toBe('Test')
    expect(updatedUser.nickname).toBe('Test2')
  })

  await t.step('Create 2', async () => {
    const user = await userModel.create({
      username: '_Test',
      nickname: '_Test2',
      email: 'test2@gmail.com',
    }).commit()
    console.log(user.value)
  })

  console.log('KV', await kvEntries(kv, {prefix: []}))
}) */

/* import {createModel} from '@kv'
import {z} from 'zod'
import {kv} from './kv.ts'
import {kvEntries} from './kvLib.ts'

const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  refresh: z.string(),
  updateAt: z.date().default(new Date()),
})

export const sessionModel = createModel(kv, sessionSchema, {
  prefix: 'session',
  primaryKey: 'id',
  index: ['refresh', 'userId'],
  indexOptions: {
    userId: {
      unique: true,
    },
  },
})

Deno.test('Create', async (t) => {
  const session = sessionModel.create(
    {
      refresh: '1',
      userId: '1',
    },
    {key: 'sess-1'}
  )
  const sessionRes = await session.commit()
  // console.log(sessionRes)

  // console.log(await sessionModel.findManyByIndex('userId', '1', {resolve: true}))

  await t.step('Update', async () => {
    if (!sessionRes.value) throw new Error('')
    const updateSession = await sessionModel.updateByIndex('refresh', sessionRes.value?.refresh)
    const newSession = await updateSession({
      refresh: '2',
      updateAt: new Date(),
    })
    await newSession.commit()
  })

  // const iter = kv.list({prefix: ['session-userId']})
  // console.log(await Array.fromAsync(iter))

  console.log('KV', await kvEntries(kv, {prefix: []}))
})
 */
/*
const init = {
  id: 'id',
  refresh: '1'
}

#KV
['session', 'id'] => init
['session-refresh', '1'] => id
['session-userId', 'userId' 'uniqKey'] => id
['session-userId', 'userId' 'uniqKey'] => id
*/
