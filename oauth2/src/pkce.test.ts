import {expect} from '@std/expect/expect'
import {createPkceChallenge, PkceChallenge, pkceVerify, usePKCE} from './pkce.ts'

const encoder = new TextEncoder()

const sha256 = async (data: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(data)))

Deno.test('createPkceChallenge()', async (t) => {
  const pkceChallenge = await createPkceChallenge()
  expect(pkceChallenge.codeChallenge.length).toBeTruthy()
  expect(pkceChallenge.codeChallengeMethod).toEqual('S256')
  expect(pkceChallenge.codeChallenge).toEqual(
    (await sha256(pkceChallenge.codeVerifier)).toBase64({alphabet: 'base64url'}),
  )
})

Deno.test(`createPkceChallenge('plain')`, async (t) => {
  const pkceChallenge = await createPkceChallenge('plain')
  expect(pkceChallenge.codeChallenge).toEqual(pkceChallenge.codeVerifier)
  expect(pkceChallenge.codeChallengeMethod).toEqual('plain')
})

Deno.test('pkceVerify()', async (t) => {
  const pkceChallenge = await createPkceChallenge()
  expect(await pkceVerify(pkceChallenge)).toBeTruthy()

  const {codeChallenge, codeChallengeMethod, codeVerifier} = pkceChallenge
  expect(await pkceVerify({codeChallenge: '', codeChallengeMethod, codeVerifier})).toBeFalsy()
  expect(await pkceVerify({codeChallenge, codeChallengeMethod: 'S256', codeVerifier})).toBeTruthy()
  expect(await pkceVerify({codeChallenge, codeChallengeMethod: 'plain', codeVerifier})).toBeFalsy()
  expect(await pkceVerify({codeChallenge, codeChallengeMethod, codeVerifier: ''})).toBeFalsy()
})

Deno.test('usePKCE()', async (t) => {
  const {uri, codeVerifier} = await usePKCE(new URL('https://example.com/authrize'))

  const codeChallenge = uri.searchParams.get('code_challenge')!
  const codeChallengeMethod = uri.searchParams.get('code_challenge_method')! as PkceChallenge['codeChallengeMethod']
  expect(await pkceVerify({codeChallenge, codeChallengeMethod, codeVerifier})).toBeTruthy()
})
