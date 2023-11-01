import {assertEquals, assertExists, assertFalse} from "https://deno.land/std/assert/mod.ts"
import {useVerify} from "../crypto/verify.ts"
import {useSign} from "../crypto/sign.ts"
import {hono} from "../deps.ts"

const app = new hono.Hono()
const keys = await crypto.subtle.generateKey(
  'Ed25519',
  true,
  ['sign', 'verify']
) as CryptoKeyPair

app.post('/verify', useVerify(keys.publicKey), async c => {
  return c.json({ok: true})
})

app.post('/sign', useSign(keys.privateKey), async c => {
  return c.json({ok: true})
})

Deno.test('sign', async c => {
  const res = await app.request('/sign', {method: 'POST'})

  assertExists(res.headers.get('X-Signature-Ed25519'), 'X-Signature-Ed25519')
  assertExists(res.headers.get('X-Signature-Timestamp'), 'X-Signature-Timestamp')

  await c.step('verify', async t => {
    const r = await app.request('/verify', {
      method: 'POST',
      headers: res.headers,
      body: res.body
    })

    assertEquals(r.ok, true)
  })
})

Deno.test('incorrect signature', async c => {
  const res = await app.request('/sign', {method: 'POST'})
  res.headers.delete('X-Signature-Ed25519')
  res.headers.delete('X-Signature-Timestamp')

  await c.step('verify', async t => {
    assertFalse(res.headers.get('X-Signature-Ed25519'), 'X-Signature-Ed25519')
    assertFalse(res.headers.get('X-Signature-Timestamp'), 'X-Signature-Timestamp')

    const r = await app.request('/verify', {
      method: 'POST',
      headers: res.headers,
      body: res.body
    })

    assertEquals(r.ok, false)
  })
})
