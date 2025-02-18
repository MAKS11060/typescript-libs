#!/usr/bin/env -S deno run -A --watch

import {expect} from 'jsr:@std/expect/expect'
import {getKvPage} from './kv_helper.ts'

const kv = await Deno.openKv(':memory:')

for (let i = 1; i < 10; i++) {
  await kv.set(['post', i], `${i}`)
}

{
  const kvPage = await getKvPage(kv, ['post'], {})
  console.log(await kvPage.entries()) // [ [[ "post", 1 ], "1" ] ]
}
{
  const kvPage = await getKvPage(kv, ['post'], {})
  expect(await kvPage.entries()).toEqual([
    [['post', 1], '1'],
    [['post', 2], '2'],
    [['post', 3], '3'],
    [['post', 4], '4'],
    [['post', 5], '5'],
    [['post', 6], '6'],
    [['post', 7], '7'],
    [['post', 8], '8'],
    [['post', 9], '9'],
  ])
}

// limit
{
  const kvPage = await getKvPage(kv, ['post'], {limit: 2})
  expect(await kvPage.entries()).toEqual([
    [['post', 1], '1'],
    [['post', 2], '2'],
  ])
}

// limit + reverse
{
  const kvPage = await getKvPage(kv, ['post'], {limit: 2, reverse: true})
  expect(await kvPage.entries()).toEqual([
    [['post', 9], '9'],
    [['post', 8], '8'],
  ])
}

// limit + offset
{
  const kvPage = await getKvPage(kv, ['post'], {limit: 2, offset: 5})
  expect(await kvPage.entries()).toEqual([
    [['post', 6], '6'],
    [['post', 7], '7'],
  ])
}

// limit + offset + reverse
{
  const kvPage = await getKvPage(kv, ['post'], {limit: 3, offset: 5, reverse: true})
  expect(await kvPage.entries()).toEqual([
    [['post', 4], '4'],
    [['post', 3], '3'],
    [['post', 2], '2'],
  ])
}

{
  const kvPage = await getKvPage(kv, ['post'], {})
  expect(await kvPage.keys()).toEqual([
    ['post', 1],
    ['post', 2],
    ['post', 3],
    ['post', 4],
    ['post', 5],
    ['post', 6],
    ['post', 7],
    ['post', 8],
    ['post', 9],
  ])
}

{
  const kvPage = await getKvPage(kv, ['post'], {})
  expect(await kvPage.values()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9'])
}
