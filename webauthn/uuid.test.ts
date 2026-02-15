import {expect} from '@std/expect/expect'
import {parse, stringify} from './uuid.ts'

const uuidStr = 'e6177a40-161e-4db8-a110-1b0464417472'
const uuidRaw = new Uint8Array([230, 23, 122, 64, 22, 30, 77, 184, 161, 16, 27, 4, 100, 65, 116, 114])

Deno.test('parse', (t) => {
  expect(parse(uuidStr)).toEqual(uuidRaw)
  expect(parse(uuidStr.toUpperCase())).toEqual(uuidRaw)
})

Deno.test('stringify', (t) => {
  expect(stringify(uuidRaw)).toEqual(uuidStr)
})

Deno.bench('stringify 1', () => { // ~ 19.1 ns
  stringify(uuidRaw)
})

Deno.bench('parse 1', () => { // ~ 500 ns
  parse(uuidStr)
})
