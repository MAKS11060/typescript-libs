#!/usr/bin/env -S deno run -A --watch

import { assertEquals } from 'jsr:@std/assert'
import { useWeekCache } from './weekCache.ts'

Deno.test('useWeekCache cache', (t) => {
  let counter = 0
  const getCounter = useWeekCache(() => counter++)

  assertEquals(getCounter(t), 0)
  assertEquals(getCounter(t), 0)
})

Deno.test('useWeekCache no-cache', (t) => {
  let counter = 0
  const getCounter = useWeekCache(() => counter++)

  assertEquals(getCounter({}), 0)
  assertEquals(getCounter({}), 1)
})

Deno.test('useWeekCache async cache', async (t) => {
  let counter = 0
  const getCounter = useWeekCache(async () => counter++)

  assertEquals(await getCounter(t), 0)
  assertEquals(await getCounter(t), 0)
})

Deno.test('useWeekCache async no-cache', async (t) => {
  let counter = 0
  const getCounter = useWeekCache(async () => counter++)

  assertEquals(await getCounter({}), 0)
  assertEquals(await getCounter({}), 1)
})
