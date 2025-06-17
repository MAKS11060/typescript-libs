import { oauth2Password } from '@maks11060/oauth2/password'
import { expect } from 'jsr:@std/expect/expect'
import type { OAuth2TokenResponse } from '../oauth2.ts'

Deno.test('oauth2Password()', async (t) => {
  const token = await oauth2Password({
    clientId: 'ID',
    clientSecret: 'SECRET',
    redirectUri: 'http://localhost/callback',
    authorizeUri: 'http://localhost/authorize',
    tokenUri: 'http://localhost/token',
    scope: 'a b',
  }, {
    username: 'USER',
    password: 'PASS',
    async fetch(url, init) {
      const req = new Request(url, init)

      expect(req.url).toBe('http://localhost/token')

      expect(req.method).toBe('POST')
      expect(req.headers.get('authorization')).toBe('Basic SUQ6U0VDUkVU')
      expect(req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')).toBe(true)

      const body = new URLSearchParams(await req.text())
      expect(body.get('grant_type')).toBe('password')
      expect(body.get('username')).toBe('USER')
      expect(body.get('password')).toBe('PASS')
      expect(body.get('scope')).toBe('a b')

      const token = {
        access_token: 'TOKEN',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: body.get('scope')!,
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
