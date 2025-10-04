import {usePKCE} from '@maks11060/oauth2/pkce'
import {expect} from 'jsr:@std/expect/expect'
import {parseAuthorizationUrl, parseRevokeRequest, parseTokenRequest} from './web.ts'

parseAuthorizationUrl
parseTokenRequest
parseRevokeRequest

Deno.test('parseAuthorizationUrl', async (t) => {
  const base = 'http://localhost'
  const uri = new URL('/authorize', base)

  expect(() => parseAuthorizationUrl(uri)).toThrow('Missing client_id')
  uri.searchParams.set('client_id', 'CLIENT_ID')

  expect(() => parseAuthorizationUrl(uri)).toThrow('Missing response_type')
  uri.searchParams.set('response_type', 'token')

  const pkce = await usePKCE(uri)

  const a = parseAuthorizationUrl(uri)
  console.log(a, pkce.codeVerifier)
})
