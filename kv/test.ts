#!/usr/bin/env -S deno run -A --watch

import {kvProvider} from './mod.ts'

const kv = await Deno.openKv(':memory:')
const kvLib = kvProvider(kv)

// MAP
const kvMap = kvLib.map('map')

await kvMap.set('1', 'a')
await kvMap.set('2', 'b')
await kvMap.has('1') // true
await kvMap.get('1') // 'a'

console.log(await kvMap.keys()) // [ "1", "2" ]
console.log(await kvMap.values()) // [ "a", "b" ]
console.log(await kvMap.entries()) // [ [ "1", "a" ], [ "2", "b" ] ]

for await (const [key, val] of kvMap) {
  console.log({key, val})
}

// SET
console.log('SET')
const kvSet = kvLib.set('set1')

await kvSet.add('1')
await kvSet.add('2')
await kvSet.has('1') // true

console.log(await kvSet.keys()) // [ "1", "2" ]
console.log(await kvSet.values()) // [ "1", "2" ]
console.log(await kvSet.entries()) // [ [ "1", "1" ], [ "2", "2" ] ]

for await (const val of kvSet) {
  console.log({val})
}
