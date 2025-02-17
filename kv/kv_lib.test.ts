#!/usr/bin/env -S deno test -A --watch

import {expect} from 'jsr:@std/expect/expect'
import {fromKvIterator, getKvPage} from './kv_lib.ts'

Deno.test('kvLib', async (t) => {
  const kv = await Deno.openKv(':memory:')

  for (let i = -5; i < 5; i++) {
    await kv.set(['key', i], i + 5)
  }
  // [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4] key
  // [ 0,  1,  2,  3,  4, 5, 6, 7, 8, 9] val

  await t.step('getKvPage', async () => {
    const kvPage = await getKvPage(kv, ['key'], {limit: 1})
    expect(kvPage[0].key).toEqual(['key', -5])
    expect(kvPage[0].value).toEqual(0)
  })

  await t.step('getKvPage + offset', async () => {
    const kvPage = await getKvPage(kv, ['key'], {limit: 1, offset: 0})
    expect(kvPage[0].key).toEqual(['key', 1])
    expect(kvPage[0].value).toEqual(6)
  })

  await t.step('getKvPage + offset + reverse', async () => {
    const kvPage = await getKvPage(kv, ['key'], {limit: 1, reverse: true, offset: 0})
    expect(kvPage[0].key).toEqual(['key', -1])
    expect(kvPage[0].value).toEqual(4)
  })

  await t.step('getKvPage + limit = 0', async () => {
    const kvPage = await getKvPage(kv, ['key'], {limit: 0})
    expect(kvPage.length).toEqual(10)
  })

  await t.step('fromKvIterator', async () => {
    const iter = kv.list<number>({prefix: ['key']})
    const keys = await fromKvIterator(iter, {
      limit: 10,
      filter(val, key) {
        return val % 2
      },
    })
    expect(keys.length).toEqual(5)
  })

  kv.close()
})
