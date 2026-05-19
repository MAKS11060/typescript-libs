import {expect} from '@std/expect/expect'
import {Aaguid, aaguid} from './aaguid.ts'

Deno.test('Test 229933', async (t) => {
  const aaguid = new Aaguid()
  aaguid.set('00000000-0000-0000-0000-000000000000', {name: 'Test'})
  aaguid.set(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]), {name: 'Test'})
  expect(aaguid.entries().toArray()).toEqual([
    ['00000000-0000-0000-0000-000000000000', {name: 'Test'}],
    ['01020304-0506-0708-090a-0b0c0d0e0f10', {name: 'Test'}],
  ])
})

Deno.test('Test 591934', async (t) => {
  const data = aaguid.get(new Uint8Array([234, 155, 141, 102, 77, 1, 29, 33, 60, 228, 182, 180, 140, 181, 117, 212]))
  expect(data?.name).toEqual('Google Password Manager')
  expect(data?.icon_dark).toBeTruthy()
  expect(data?.icon_light).toBeTruthy()
})

Deno.test('Test 407404', async (t) => {
  const data = aaguid.get(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))
  expect(data).toBeUndefined()
})

Deno.test('decodeAAGUID', async (t) => {
  const uuid = Aaguid.Format(new Uint8Array([234, 155, 141, 102, 77, 1, 29, 33, 60, 228, 182, 180, 140, 181, 117, 212]))
  expect(uuid).toBe('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4')
})
