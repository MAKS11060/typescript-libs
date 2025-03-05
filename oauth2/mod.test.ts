#!/usr/bin/env -S deno run -A

import type {CreateOAuth2Config} from "./mod.ts"

// providers/example.ts
const createExampleConfig: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  scope: string | string[]
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri.toString(),
  authorizeUri: 'https://example.com/oauth2/authorize',
  tokenUri: 'https://example.com/api/oauth2/token',
  scope: config.scope,
})



/* import {createGithubOauth2, oauth2Authorize, oauth2ExchangeCode, usePKCE} from './mod.ts'

const config = createGithubOauth2({
  clientId: Deno.env.get('GITHUB_CLIENT_ID')!,
  clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET')!,
  redirectUri: Deno.env.get('OAUTH2_REDIRECT')!,
})

// /api/login
const state = crypto.randomUUID()
const {uri, codeVerifier} = await usePKCE(oauth2Authorize(config, state))

// api/login/callback
const code = '1234'
const token = oauth2ExchangeCode(config, {code, codeVerifier})
 */

/* const state = crypto.randomUUID()
const uri = oauth2Authorize(config, state)
console.log({uri: uri.toString()})

const code = '12365467890'
const tokenResponse = await oauth2ExchangeCode(config, {code})
console.log(tokenResponse)

const oauth2Token = normalizeOAuth2Token(tokenResponse) // Structured Token

isTokenExpired(oauth2Token) // false

const rawTokenResponse = {
  access_token: 'abc123',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'xyz789',
  scope: 'read  write, user:read',
} */


// {
//   const state = crypto.randomUUID()
//   const {uri, codeVerifier} = await usePKCE(oauth2Authorize(config, state))

//   console.log({uri: uri.toString(), codeVerifier})
// }

// {
//   const code = ''
//   const codeVerifier = ''
//   try {
//     const token = await oauth2ExchangeCode(config, {code, codeVerifier})
//     console.log(token)
//   } catch (e) {
//     if (e instanceof OAuth2Exception) {
//       console.error(e)
//     }
//     console.error(e)
//   }
// }
