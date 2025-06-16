import { decodeBase64Url, encodeBase64Url } from '@std/encoding/base64url'
import { importKeyPair } from 'jsr:@maks11060/crypto'
import { OAuth2StateStorage, StateData } from './mod.ts'

export const createStateStorageStateless = async (): Promise<OAuth2StateStorage> => {
  const keys = await importKeyPair('hex', {
    alg: 'Ed25519',
    privateKey: '5ba9530aec069b23e077fcd525ecb22325608c3d9b97158da634cfeef2fa4ff3',
    publicKey: 'be1e7c08224b3c2f78b512de205531474aff5d300418b80e23ff0ea3ffc0a9d6',
  })
  const maxAge = 1000 * 60 * 10 // 10 min

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return {
    async set(state, data) {
      const timestamp = Date.now()
      const payload = JSON.stringify({timestamp, state, data})
      const sign = await crypto.subtle.sign(
        'Ed25519',
        keys.privateKey,
        encoder.encode(payload),
      )
      return `${encodeBase64Url(payload)}.${encodeBase64Url(sign)}`
    },
    async get(stateKey) {
      const [_payload, _sign] = stateKey.split('.', 2)
      const payloadBytes = decodeBase64Url(_payload)
      const sign = decodeBase64Url(_sign)

      const verified = await crypto.subtle.verify(
        'Ed25519',
        keys.publicKey,
        sign,
        payloadBytes,
      )
      if (!verified) throw new Error('State signature invalid')

      const payload = decoder.decode(payloadBytes)
      const {timestamp, state, data} = JSON.parse(payload) as {
        timestamp: number
        state: string
        data: StateData
      }
      if (Number(timestamp) + maxAge <= Date.now()) throw new Error('State is expires')

      return data
    },
  }
}

Deno.test('createStateStorageStateless()', async (t) => {
  const stateStorageStateless = await createStateStorageStateless()
  const state = await stateStorageStateless.set('123456', {service: 'test'})
  console.log(state)

  const res = await stateStorageStateless.get(state)
  console.log(res)
})
