import {
  oauth2Authorize,
  OAuth2ClientConfig,
  OAuth2Exception,
  oauth2ExchangeCode,
  OAuth2TokenResponse,
  PkceChallenge,
  pkceVerify,
  usePKCE,
} from '@maks11060/oauth2'
import { encodeBase64Url } from '@std/encoding/base64url'
import { Hono } from 'hono'
import { ErrorMap } from './src/error.ts'

const RESPONSE_TYPE = 'response_type'
const CODE = 'code'
const STATE = 'state'
const CLIENT_ID = 'client_id'
const CLIENT_SECRET = 'client_secret'
const REDIRECT_URI = 'redirect_uri'

Deno.test('Test 426464', async (t) => {
  const app = new Hono() //

  const redirectUri = 'http://localhost/oauth2/callback'
  const oauth2ClientConfig: OAuth2ClientConfig = {
    clientId: 'CLIENT_ID',
    clientSecret: 'CLIENT_SECRET',
    authorizeUri: 'http://example.com/authorize',
    tokenUri: 'http://example.com/oauth2/token',
    // redirectUri,
  }

  // Server
  app.get('/authorize', (c) => {
    const uri = new URL(c.req.url)
    const responseType = uri.searchParams.get(RESPONSE_TYPE)! as 'code'
    const clientId = uri.searchParams.get(CLIENT_ID)!
    const clientRedirectUri = uri.searchParams.get('redirect_uri')
    const state = uri.searchParams.get('state')

    //
    const callbackURI = new URL(clientRedirectUri ?? redirectUri)
    callbackURI.searchParams.set('code', 'CODE')
    state && callbackURI.searchParams.set('state', state)

    return c.redirect(callbackURI)
  })
  app.post('/oauth2/token', (c) => {
    const uri = new URL(c.req.url)

    const code = uri.searchParams.get('code')
    const state = uri.searchParams.get('state')

    return c.json(
      {
        token_type: 'Bearer',
        access_token: 'abc',
      } satisfies OAuth2TokenResponse,
    )
  })

  // Client / code
  const authorizeUri = oauth2Authorize(oauth2ClientConfig)
  // console.log(authorizeUri.toString())

  // step 1
  const res = await app.request(authorizeUri)
  const uri = new URL(res.headers.get('location')!)

  // step 2
  const token = await oauth2ExchangeCode(oauth2ClientConfig, {
    code: uri.searchParams.get('code')!,
    fetch: app.request as typeof fetch,
  })
  // console.log(token)
})

Deno.test('Test 442914', async (t) => {
  const app = new Hono() //

  const redirectUri = 'http://localhost/oauth2/callback'
  const oauth2ClientConfig: OAuth2ClientConfig = {
    clientId: 'CLIENT_ID',
    clientSecret: 'CLIENT_SECRET',
    authorizeUri: 'http://example.com/authorize',
    tokenUri: 'http://example.com/oauth2/token',
    // redirectUri,
    pkce: true,
  }

  // Server
  const pkceStore = new Map<string, {challenge: string; method: 'S256' | 'plain'}>()
  app.get('/authorize', async (c) => {
    const uri = new URL(c.req.url)
    const responseType = uri.searchParams.get(RESPONSE_TYPE)! as 'code'
    const clientId = uri.searchParams.get(CLIENT_ID)!
    const clientRedirectUri = uri.searchParams.get(REDIRECT_URI)
    const state = uri.searchParams.get(STATE)

    const code = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))

    // PKCE
    const codeChallenge = uri.searchParams.get('code_challenge')
    const codeChallengeMethod = uri.searchParams.get('code_challenge_method')! as PkceChallenge['codeChallengeMethod']
    if (codeChallenge && codeChallengeMethod) {
      pkceStore.set(code, {challenge: codeChallenge, method: codeChallengeMethod})
    }

    // save: code + client_id + pkce

    // res
    const callbackURI = new URL(clientRedirectUri ?? redirectUri)
    callbackURI.searchParams.set(CODE, code)
    state && callbackURI.searchParams.set(STATE, state)

    return c.redirect(callbackURI)
  })
  app.post('/oauth2/token', async (c) => {
    const {
      grant_type,
      client_id,
      code,
      client_secret,
      redirect_uri,
      code_verifier: codeVerifier,
    } = await c.req.parseBody() as Record<string, string>

    // PKCE
    const pkce = pkceStore.get(code)
    if (pkce && codeVerifier) {
      if (!await pkceVerify({codeChallenge: pkce.challenge, codeChallengeMethod: pkce.method, codeVerifier})) {
        throw new OAuth2Exception(ErrorMap.invalid_grant, 'Code verifier does not match')
      }
    }

    //
    return c.json({token_type: 'Bearer', access_token: '123'} satisfies OAuth2TokenResponse)
  })

  // Client / code
  const {uri: authorizeUri, codeVerifier} = oauth2ClientConfig.pkce
    ? await usePKCE(oauth2Authorize(oauth2ClientConfig))
    : {uri: oauth2Authorize(oauth2ClientConfig)}
  // console.log(authorizeUri.toString())

  // step 1
  const res = await app.request(authorizeUri)
  const uri = new URL(res.headers.get('location')!)

  // step 2
  const token = await oauth2ExchangeCode(oauth2ClientConfig, {
    code: uri.searchParams.get('code')!,
    fetch: app.request as typeof fetch,
    codeVerifier,
  })
  console.log(token)
})
