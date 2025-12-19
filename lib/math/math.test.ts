import {expect} from '@std/expect'
import {toPercent} from './math.ts'

Deno.test('toPercent', async (t) => {
  expect(toPercent(0, 0, 100)).toEqual(0)
  expect(toPercent(1, 0, 100)).toEqual(1)
  expect(toPercent(10, 0, 100)).toEqual(10)
  expect(toPercent(100, 0, 100)).toEqual(100)

  expect(toPercent(-100, 0, 100)).toEqual(-100)
  expect(toPercent(1000, 0, 100)).toEqual(1000)

  expect(toPercent(0, 0, 50)).toEqual(0)
  expect(toPercent(1, 0, 50)).toEqual(2)
  expect(toPercent(5, 0, 50)).toEqual(10)
  expect(toPercent(10, 0, 50)).toEqual(20)
  expect(toPercent(50, 0, 50)).toEqual(100)
  expect(toPercent(100, 0, 50)).toEqual(200)
})
