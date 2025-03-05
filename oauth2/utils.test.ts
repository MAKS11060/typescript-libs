#!/usr/bin/env -S deno run -A --watch

import {expect} from 'jsr:@std/expect/expect'
import {isTokenExpired, normalizeOAuth2Token, type OAuth2TokenResponse} from './mod.ts'

const rawTokenResponse: OAuth2TokenResponse = {
  access_token: 'abc123',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'xyz789',
  scope: 'read  write, user:read',
}

const rawTokenResponseExpired: OAuth2TokenResponse = {
  access_token: 'abc123',
  token_type: 'Bearer',
  expires_in: -1,
  refresh_token: 'xyz789',
  scope: 'read  write, user:read',
}

const rawTokenResponseGithub: OAuth2TokenResponse = {
  access_token: 'gh_abc123',
  token_type: 'Bearer',
}

const token = normalizeOAuth2Token(rawTokenResponse)
console.log(token)
expect(token).toStrictEqual({
  accessToken: 'abc123',
  expiresIn: 3600,
  refreshToken: 'xyz789',
  scope: ['read', 'write', 'user:read'],
  tokenType: 'Bearer',
})

expect(isTokenExpired(token)).toBe(false)
expect(isTokenExpired(rawTokenResponse)).toBe(false)
expect(isTokenExpired(rawTokenResponseGithub)).toBe(false)
expect(isTokenExpired(rawTokenResponseExpired)).toBe(true)
