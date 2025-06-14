#!/usr/bin/env -S deno run -A --watch

import { expect } from 'jsr:@std/expect/expect'
import { kvMap, kvSet } from './kv_base.ts'

const kv = await Deno.openKv(':memory:')

// MAP
const map = kvMap(kv, 'map')

expect(await map.set('1', 'a')).toBe(true)
expect(await map.set('2', 'b')).toBe(true)
expect(await map.has('1')).toBe(true)
expect(await map.get('1')).toBe('a')

expect(await map.keys()).toEqual(['1', '2'])
expect(await map.values()).toEqual(['a', 'b'])
expect(await map.entries()).toEqual([
  ['1', 'a'],
  ['2', 'b'],
])

for await (const [key, val] of map) {
  console.log({key, val})
}

// SET
console.log('SET')
const set = kvSet(kv, 'set1')

expect(await set.add('1')).toBe(true)
expect(await set.add('2')).toBe(true)
expect(await set.has('1')).toBe(true)

expect(await set.keys()).toEqual(['1', '2'])
expect(await set.values()).toEqual(['1', '2'])
expect(await set.entries()).toEqual([
  ['1', '1'],
  ['2', '2'],
])

for await (const val of set) {
  console.log({val})
}
