import { expect } from 'jsr:@std/expect/expect'
import type { OAuth2TokenResponse } from '../oauth2.ts'
import { oauth2ClientCredentials } from './client_credentials.ts'

Deno.test('oauth2ClientCredentials()', async () => {
  const token = await oauth2ClientCredentials({
    clientId: 'ID',
    clientSecret: 'SECRET',
    redirectUri: 'http://localhost/callback',
    authorizeUri: 'http://localhost/authorize',
    tokenUri: 'http://localhost/token',
    scope: 'a b',
  }, {
    async fetch(url, init) {
      const req = new Request(url, init)

      expect(req.url).toBe('http://localhost/token')

      expect(req.method).toBe('POST')
      expect(req.headers.get('authorization')).toBe('Basic SUQ6U0VDUkVU')
      expect(req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')).toBe(true)

      const body = new URLSearchParams(await req.text())
      expect(body.get('grant_type')).toBe('client_credentials')
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

Deno.test('oauth2ClientCredentials() cred in query', async () => {
  const token = await oauth2ClientCredentials({
    clientId: 'ID',
    clientSecret: 'SECRET',
    redirectUri: 'http://localhost/callback',
    authorizeUri: 'http://localhost/authorize',
    tokenUri: 'http://localhost/token',
    scope: 'a b',
  }, {
    credentialLocation: 'query',
    async fetch(url, init) {
      const req = new Request(url, init)

      expect(req.url).toBe('http://localhost/token')

      expect(req.method).toBe('POST')
      expect(req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')).toBe(true)

      const body = new URLSearchParams(await req.text())
      expect(body.get('grant_type')).toBe('client_credentials')
      expect(body.get('client_id')).toBe('ID')
      expect(body.get('client_secret')).toBe('SECRET')
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
