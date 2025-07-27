import { expect } from 'jsr:@std/expect/expect'
import type { OAuth2TokenResponse } from '../oauth2.ts'
import { oauth2Authorize, oauth2ExchangeCode } from './authorization_code.ts'

Deno.test('oauth2Authorize()', () => {
  const authorizeUri = oauth2Authorize({
    clientId: 'ID',
    clientSecret: 'SECRET',
    redirectUri: 'http://localhost/callback',
    authorizeUri: 'http://localhost/authorize',
    tokenUri: 'http://localhost/token',
    scope: 'a b',
  }, {state: 'STATE'})

  expect(authorizeUri.searchParams.get('response_type')).toEqual('code')
  expect(authorizeUri.searchParams.get('client_id')).toEqual('ID')
  expect(authorizeUri.searchParams.get('redirect_uri')).toEqual('http://localhost/callback')
  expect(authorizeUri.searchParams.get('scope')).toEqual('a b')
  expect(authorizeUri.searchParams.get('state')).toEqual('STATE')

  expect(authorizeUri.toString()).toEqual(
    'http://localhost/authorize?response_type=code&client_id=ID&redirect_uri=http%3A%2F%2Flocalhost%2Fcallback&scope=a+b&state=STATE',
  )
})

Deno.test('oauth2ExchangeCode()', async () => {
  const token = await oauth2ExchangeCode({
    clientId: 'ID',
    clientSecret: 'SECRET',
    redirectUri: 'http://localhost/callback',
    authorizeUri: 'http://localhost/authorize',
    tokenUri: 'http://localhost/token',
    scope: 'a b',
  }, {
    code: 'CODE',
    async fetch(url, init) {
      const req = new Request(url, init)

      expect(req.url).toBe('http://localhost/token')

      expect(req.method).toBe('POST')
      expect(req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')).toBe(true)

      const body = new URLSearchParams(await req.text())
      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('client_id')).toBe('ID')
      expect(body.get('code')).toBe('CODE')
      expect(body.get('redirect_uri')).toBe('http://localhost/callback')

      const token = {
        access_token: 'TOKEN',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'a b',
      } satisfies OAuth2TokenResponse
      return Response.json(token)
    },
  })

  expect(token).toEqual({
    access_token: 'TOKEN',
    token_type: 'Bearer',
    expires_in: 3600,
    scope: 'a b',
  })
})
