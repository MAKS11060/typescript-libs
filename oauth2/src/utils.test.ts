#!/usr/bin/env -S deno run -A --watch

import { expect } from 'jsr:@std/expect/expect'
import type { OAuth2TokenResponse } from './oauth2.ts'
import { normalizeOAuth2Token } from './utils.ts'

Deno.test('isTokenExpired', (t) => {
  const rawToken: OAuth2TokenResponse = {
    access_token: 'abc123',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'xyz789',
    scope: 'read  write, user:read',
  }

  const token = normalizeOAuth2Token(rawToken)
  expect(token).toStrictEqual({
    accessToken: 'abc123',
    expiresIn: 3600,
    refreshToken: 'xyz789',
    scope: ['read', 'write', 'user:read'],
    tokenType: 'Bearer',
  })
})
