#!/usr/bin/env -S deno test -A

import { delay } from 'jsr:@std/async/delay'
import { createCachedFetch } from './cache.ts'
import { expect } from 'jsr:@std/expect/expect'

Deno.test('cachedFetch', async (t) => {
  const name = `cache-${Date.now()}`

  const cachedFetch = await createCachedFetch({
    name,
    ttl: 30,
    log: true,
    deleteExpired: true,
  })

  const res = await cachedFetch('https://cdn.donmai.us/original/53/52/535258f480f5646bf5122b9a6e5e3511.jpg')
  await res.blob()

  await delay(1000)
  await t.step('fetch 2', async () => {
    const res2 = await cachedFetch('https://cdn.donmai.us/original/53/52/535258f480f5646bf5122b9a6e5e3511.jpg')
    await res2.blob()
    expect(res2.headers.get('Date')).toBe(res.headers.get('Date'))
  })

  await caches.delete(name)
})
