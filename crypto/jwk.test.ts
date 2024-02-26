#!/usr/bin/env -S deno test --watch

import {assertEquals} from 'https://deno.land/std/assert/mod.ts'
import {KeyAlg, encodeKeyHex, decodeKeyHex} from './jwk.ts'
import {generateKeyPair} from './keys.ts'

const algs: Partial<Record<KeyAlg, {publicLen: number; privateLen: number}>> = {
  Ed25519: {publicLen: 64, privateLen: 64},
  'P-256': {publicLen: 128, privateLen: 64},
  'P-384': {publicLen: 192, privateLen: 96},
}

for (let [_alg, option] of Object.entries(algs)) {
  const alg = _alg as KeyAlg
  Deno.test(`encodeKeyHex-${alg}`, async (c) => {
    const keys = await generateKeyPair(alg)
    const key = await encodeKeyHex(keys.privateKey)
    assertEquals(key.public.length, option.publicLen)
    assertEquals(key.private.length, option.privateLen)

    await c.step(`decodeKeyHex-${alg}`, async () => {
      const privateKey = await decodeKeyHex({alg, ...key})
      assertEquals(privateKey.type, 'private')
      assertEquals(privateKey.extractable, false)

      const {public: pub} = key
      const publicKey = await decodeKeyHex({alg, public: pub})
      assertEquals(publicKey.type, 'public')
      assertEquals(publicKey.extractable, false)
    })
  })
}

// {
//   const alg: KeyAlg = 'Ed25519'
//   const keys = await generateKeyPair(alg)
//   const key = await encodeKeyHex(keys.privateKey)
//   await decodeKeyHex({alg, ...key})
// }

// {
//   const alg: KeyAlg = 'P-256'
//   const keys = await generateKeyPair(alg)
//   const raw = await crypto.subtle.exportKey('pkcs8', keys.privateKey)
//   console.log(raw)
// }

// {
//   const keys = await generateKeyPair('P-256')
//   const keysHex = await encodeKeyHex(keys.privateKey) // only private
//   console.log(keysHex.private)
//   console.log(keysHex.public)
// }
