#!/usr/bin/env -S deno run -A --watch

import { delay } from 'jsr:@std/async/delay'
import { useWeekCache } from './weekCache.ts'

const fn1 = useWeekCache((a: string, b: string) => a + b)
const fn2 = useWeekCache(async (a: string, b: string) => {
  await delay(10)
  return a + b
})

Deno.bench('fn1', {group: 'cache'}, () => {
  fn1(fn1, 'a', 'b')
})

Deno.bench('fn2 async', {group: 'cache'}, async () => {
  await fn2(fn2, 'a', 'b')
})

Deno.bench('fn1 no-cache', {group: 'cache'}, () => {
  fn1({}, 'a', 'b')
})

Deno.bench('fn2 no-cache async', {group: 'cache'}, async () => {
  await fn2({}, 'a', 'b')
})
