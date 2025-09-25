import {formatAAGUID} from '@maks11060/webauthn'
import {decodeAAGUID, getKnownAAGUID} from '@maks11060/webauthn/aaguid'
import {expect} from 'jsr:@std/expect/expect'

Deno.test('format', async (t) => {
  const uuid = formatAAGUID(new Uint8Array(16))
  expect(uuid).toEqual('00000000-0000-0000-0000-000000000000')

  await t.step('invalid uuid', async (t) => {
    expect(() => formatAAGUID(new Uint8Array(1))).toThrow()
  })
})

Deno.test('getKnownAAGUID', async (t) => {
  const uuid = getKnownAAGUID(
    new Uint8Array([234, 155, 141, 102, 77, 1, 29, 33, 60, 228, 182, 180, 140, 181, 117, 212]),
  )

  expect(uuid?.name).toEqual('Google Password Manager')
  expect(uuid?.icon_dark).toBeTruthy()
  expect(uuid?.icon_light).toBeTruthy()

  await t.step('getKnownAAGUID unknown aaguid', async (t) => {
    const uuid = getKnownAAGUID(new Uint8Array(16))
    expect(uuid).toEqual(null)
  })
})


Deno.test('decodeAAGUID', async (t) => {
  const uuid = decodeAAGUID('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4')
  expect(uuid).toEqual(new Uint8Array([234, 155, 141, 102, 77, 1, 29, 33, 60, 228, 182, 180, 140, 181, 117, 212]))
})
