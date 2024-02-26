import {assert, assertEquals} from 'https://deno.land/std/assert/mod.ts'
import {timingSafeEqual} from 'https://deno.land/std/crypto/timing_safe_equal.ts'
import {
  aesEncrypt,
  aesEncryptString,
  aesEncryptObject,
  generateKeyAesGcm,
  importKeyAesGcm,
  exportKeyAesGcm,
} from './aes.ts'

Deno.test('generateKeyAesGcm', async (c) => {
  const aesKey = await generateKeyAesGcm()

  await c.step('export key', async (c) => {
    const rawKeys = await exportKeyAesGcm(aesKey)

    await c.step('import key', async (c) => {
      const k = await importKeyAesGcm(rawKeys)

      assert(timingSafeEqual(aesKey.iv, k.iv))
      assert(
        timingSafeEqual(
          await crypto.subtle.exportKey('raw', aesKey.key),
          await crypto.subtle.exportKey('raw', k.key)
        )
      )
    })
  })
})

Deno.test('aesEncrypt', async () => {
  const raw = crypto.getRandomValues(new Uint8Array(128)) // input data

  const aesKey = await generateKeyAesGcm()
  const {encrypt, decrypt} = aesEncrypt(aesKey)

  const out = await encrypt(raw)
  const data = await decrypt(out)

  assert(timingSafeEqual(new Uint8Array(data), raw))
})

Deno.test('aesEncryptString', async () => {
  const text = 'hello world' // input data

  const aesKey = await generateKeyAesGcm()
  const {encrypt, decrypt} = aesEncryptString(aesKey)

  const out = await encrypt(text)
  const data = await decrypt(out)

  assertEquals(data, text)
})

Deno.test('aesEncryptObject', async () => {
  type Data = {msg: string}

  const aesKey = await generateKeyAesGcm()
  const {encrypt, decrypt} = aesEncryptObject<Data>(aesKey)

  const out = await encrypt({msg: 'hello'})
  const data = await decrypt(out)

  assertEquals(data, {msg: 'hello'})
})
