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

interface OAuth2AppConfig {
  type?: 'confidential' | 'public'
  appName: string
  clientId: string
  clientSecret: string
  redirectUri: string[]
}

const getClient = (clientId: string): OAuth2AppConfig => {
  const redirectUri = 'http://localhost/oauth2/callback'
  const apps: OAuth2AppConfig[] = [
    {
      appName: 'app1',
      clientId: '1',
      clientSecret: 'SECRET',
      redirectUri: [redirectUri],
    },
    {
      type: 'confidential',
      appName: 'app2',
      clientId: '2',
      clientSecret: 'SECRET',
      redirectUri: [redirectUri],
    },
    {
      type: 'public',
      appName: 'app3',
      clientId: '3',
      clientSecret: 'SECRET',
      redirectUri: [redirectUri],
    },
  ]

  const app = apps.find((app) => app.clientId === clientId)
  if (!app) throw new OAuth2Exception(ErrorMap.unauthorized_client)
  return app
}

const getClientRedirectUri = (client: OAuth2AppConfig, redirect_uri?: string | null): string => {
  if (redirect_uri) {
    if (!client.redirectUri.includes(redirect_uri)) {
      throw new OAuth2Exception(ErrorMap.invalid_request)
    }
    return redirect_uri
  }

  // default redirect
  if (client.redirectUri.length === 1) {
    return client.redirectUri[0]
  }
  throw new OAuth2Exception(ErrorMap.invalid_request)
}

// Helpers
const ResponseType = [
  'code',
  'token',
] as const
const GrantType = [
  'client_credentials',
  'authorization_code',
  'refresh_token',
  'password',
] as const

export type ResponseType = typeof ResponseType[number]
export type GrantType = typeof GrantType[number]

export const isResponseType = (type: unknown): type is ResponseType => {
  return ResponseType.includes(String(type) as ResponseType)
}
export const isGrantType = (type: unknown): type is GrantType => {
  return GrantType.includes(String(type) as GrantType)
}

const createOAuth2Server = (options: {
  getClient(clientId: string): OAuth2AppConfig
}) => {
  return {
    authorizeCheck() {},
    authorize(uri: URL) {
      const response_type = uri.searchParams.get('response_type')
      if (!isResponseType(response_type)) throw new OAuth2Exception(ErrorMap.invalid_request)

      const client_id = uri.searchParams.get('client_id')
      if (!client_id) throw new OAuth2Exception(ErrorMap.invalid_request)

      const client = options.getClient(client_id)
      if (!client) throw new OAuth2Exception(ErrorMap.unauthorized_client)
    },
    token() {},
  }
}

Deno.test('Test 442914', async (t) => {
  const app = new Hono() //
  const oauth2AppConfig = getClient('1')

  const oauth2ClientConfig: OAuth2ClientConfig = {
    clientId: oauth2AppConfig.clientId,
    clientSecret: oauth2AppConfig.clientSecret,
    redirectUri: oauth2AppConfig.redirectUri[0],
    authorizeUri: 'http://example.com/authorize',
    tokenUri: 'http://example.com/oauth2/token',
    pkce: true,
  }

  // Server
  const store = new Map<string, {
    code: string
    clientId: string
    redirectUri: string
    codeChallenge: string | null
    codeChallengeMethod: 'S256' | 'plain' | null
    expiresAt: Temporal.Instant
  }>()

  app.get('/authorize', async (c) => {
    const uri = new URL(c.req.url)
    const responseType = uri.searchParams.get(RESPONSE_TYPE)! as ResponseType
    const clientId = uri.searchParams.get(CLIENT_ID)!
    const clientRedirectUri = uri.searchParams.get(REDIRECT_URI)
    const state = uri.searchParams.get(STATE)

    const client = getClient(clientId)
    const redirectUri = getClientRedirectUri(client, clientRedirectUri)

    const code = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))

    // PKCE
    const codeChallenge = uri.searchParams.get('code_challenge')
    const codeChallengeMethod = uri.searchParams.get('code_challenge_method')! as PkceChallenge['codeChallengeMethod']

    // save: code + client_id + pkce
    store.set(code, {
      code,
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      expiresAt: Temporal.Now.instant().add({minutes: 10}),
    })

    // res
    const callbackUri = new URL(redirectUri)
    callbackUri.searchParams.set(CODE, code)
    state && callbackUri.searchParams.set(STATE, state)

    return c.redirect(callbackUri)
  })

  app.post('/oauth2/token', async (c) => {
    const {
      code,
      grant_type,
      client_id,
      client_secret,
      redirect_uri,
      code_verifier: codeVerifier,
    } = Object.fromEntries(await c.req.formData()) as Record<string, string>

    // get from store
    const {expiresAt, codeChallenge, codeChallengeMethod, clientId, redirectUri} = store.get(code)!

    const isExpired = Temporal.Instant.compare(Temporal.Now.instant(), expiresAt) > 0
    if (isExpired) throw new OAuth2Exception(ErrorMap.invalid_request, 'Code is expired')

    // PKCE
    if (codeChallenge && codeChallengeMethod && codeVerifier) {
      if (!await pkceVerify({codeChallenge, codeChallengeMethod, codeVerifier})) {
        throw new OAuth2Exception(ErrorMap.invalid_grant, 'Code verifier does not match')
      }
    }

    //
    if (clientId !== client_id) throw new OAuth2Exception(ErrorMap.invalid_client)
    // if (redirectUri !== redirect_uri) throw new OAuth2Exception(ErrorMap.unauthorized_client)

    //
    return c.json({token_type: 'Bearer', access_token: 'crypto.randomUUID()'} satisfies OAuth2TokenResponse)
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
