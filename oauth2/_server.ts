import {
  oauth2Authorize,
  OAuth2ClientConfig,
  oauth2ClientCredentials,
  OAuth2Exception,
  oauth2ExchangeCode,
  oauth2Password,
  oauth2RefreshToken,
  OAuth2TokenResponse,
  PkceChallenge,
  pkceVerify,
  usePKCE,
} from '@maks11060/oauth2'
import { oauth2Implicit } from '@maks11060/oauth2/implicit'
import { decodeBase64 } from '@std/encoding/base64'
import { encodeBase64Url } from '@std/encoding/base64url'
import { Hono } from 'hono'
import { expect } from 'jsr:@std/expect/expect'
import { ErrorMap } from './src/error.ts'

const RESPONSE_TYPE = 'response_type'
const CODE = 'code'
const STATE = 'state'
const CLIENT_ID = 'client_id'
const CLIENT_SECRET = 'client_secret'
const REDIRECT_URI = 'redirect_uri'

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

const generateToken = (options?: {expires_in?: number; refresh?: boolean}): OAuth2TokenResponse => {
  return {
    access_token: crypto.randomUUID(),
    token_type: 'Bearer',
    expires_in: options?.expires_in ?? 3600,
    ...(options?.refresh && {refresh_token: crypto.randomUUID()}),
  }
}

const parseBasicAuth = (authorization?: string) => {
  if (!authorization?.startsWith('Basic')) return
  const [username, password] = new TextDecoder().decode(decodeBase64(authorization.slice(6))).split(':', 2)
  return {username, password}
}

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

interface OAuth2StorageData {
  code: string
  clientId: string
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: 'S256' | 'plain' | null
  expiresAt: Temporal.Instant
}

const createOAuth2Server = (options: {
  getClient(clientId: string): OAuth2AppConfig
  storage: {
    create(data: OAuth2StorageData): Promise<void> | void
    get(code: string): Promise<OAuth2StorageData> | void
  }
  grants: {
    authorizationCode?: {
      generate(data: {
        client: OAuth2AppConfig
        store: OAuth2StorageData
      }): OAuth2TokenResponse | Promise<OAuth2TokenResponse>
    }
    /** obtain new token using refresh_token */
    refreshToken?(data: {
      refresh_token: string
      client_id: string
    }): OAuth2TokenResponse | Promise<OAuth2TokenResponse>

    implicit?(data: {
      client: OAuth2AppConfig
    }): OAuth2TokenResponse | Promise<OAuth2TokenResponse>

    password?(data: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }): OAuth2TokenResponse | Promise<OAuth2TokenResponse>

    credentials?(data: {
      client_id: string
      client_secret: string
    }): OAuth2TokenResponse | Promise<OAuth2TokenResponse>
  }
}) => {
  return {
    authorizeCheck() {},

    async authorize(uri: URL) {
      // response_type
      const responseType = uri.searchParams.get('response_type')
      if (!isResponseType(responseType)) throw new OAuth2Exception(ErrorMap.invalid_request)

      if (
        (responseType === 'code' && !options.grants?.authorizationCode) ||
        (responseType === 'token' && !options.grants?.implicit)
      ) throw new OAuth2Exception(ErrorMap.unsupported_response_type)

      // client_id
      const clientId = uri.searchParams.get(CLIENT_ID)!
      if (!clientId) throw new OAuth2Exception(ErrorMap.invalid_request)

      const client = options.getClient(clientId)
      if (!client) throw new OAuth2Exception(ErrorMap.unauthorized_client)

      // redirect_uri
      const clientRedirectUri = uri.searchParams.get(REDIRECT_URI)
      const redirectUri = getClientRedirectUri(client, clientRedirectUri)

      // PKCE
      const codeChallenge = uri.searchParams.get('code_challenge')
      const codeChallengeMethod = uri.searchParams.get('code_challenge_method') as PkceChallenge['codeChallengeMethod']
      if (codeChallenge && codeChallengeMethod) {
        if (!['S256', 'plain'].includes(codeChallengeMethod)) {
          throw new OAuth2Exception(ErrorMap.invalid_request, 'code_challenge incorrect')
        }
      }

      // callback uri
      const authorizeUri = new URL(redirectUri)

      // results
      if (responseType === 'code') {
        // generate code
        const code = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
        authorizeUri.searchParams.set(CODE, code)

        // external storage
        await options.storage.create({
          code,
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          expiresAt: Temporal.Now.instant().add({minutes: 10}),
        })

        // state
        const state = uri.searchParams.get(STATE)
        state && authorizeUri.searchParams.set(STATE, state)

        return {responseType, authorizeUri}
      } else if (responseType === 'token') {
        const body = new URLSearchParams()

        const token = await options.grants.implicit?.({client})!

        body.set('access_token', token.access_token)
        body.set('token_type', token.token_type)
        body.set('expires_in', String(token.expires_in))
        if (token.scope) body.set('expires_in', token.scope)

        // PKCE
        if (codeChallenge && codeChallengeMethod) {
          codeChallenge && body.set('code_challenge', codeChallenge)
          codeChallengeMethod && body.set('code_challenge_method', codeChallengeMethod)
        }

        // state
        const state = uri.searchParams.get(STATE)
        state && body.set(STATE, state)

        authorizeUri.hash = body.toString() // ? or encodeURIComponent(body.toString())

        return {responseType, authorizeUri}
      }

      throw new OAuth2Exception(ErrorMap.unsupported_response_type)
    },

    async token(
      data:
        | {
          grant_type: 'authorization_code'
          code: string
          client_id: string
          client_secret: string
          codeVerifier?: string
          state?: string
        }
        | {grant_type: 'refresh_token'; client_id: string; refresh_token: string}
        | {grant_type: 'client_credentials'; client_id: string; client_secret: string}
        | {grant_type: 'password'; client_id: string; client_secret: string; username: string; password: string},
    ) {
      // const grantType = uri.searchParams.get('grant_type')
      const grantType = data.grant_type
      if (!isGrantType(grantType)) throw new OAuth2Exception(ErrorMap.unsupported_grant_type)
      if (
        (grantType === 'authorization_code' && !options.grants?.authorizationCode) ||
        (grantType === 'refresh_token' && !options.grants?.refreshToken) ||
        (grantType === 'password' && !options.grants?.password) ||
        (grantType === 'client_credentials' && !options.grants?.credentials)
      ) throw new OAuth2Exception(ErrorMap.unsupported_grant_type)

      const client = await options.getClient(data.client_id)

      if (grantType === 'authorization_code') {
        const store = await options.storage.get(data.code)!
        const {expiresAt, clientId, redirectUri, codeChallenge, codeChallengeMethod} = store
        const {client_id, client_secret, codeVerifier} = data

        const isExpired = Temporal.Instant.compare(Temporal.Now.instant(), expiresAt) > 0
        if (isExpired) throw new OAuth2Exception(ErrorMap.invalid_request, 'Code is expired')

        // PKCE
        if (codeChallenge && codeChallengeMethod) {
          if (!codeVerifier || !await pkceVerify({codeChallenge, codeChallengeMethod, codeVerifier})) {
            throw new OAuth2Exception(ErrorMap.invalid_grant, 'Code verifier does not match')
          }
        }

        //
        if (clientId !== client_id) throw new OAuth2Exception(ErrorMap.invalid_client)
        // if (redirectUri !== redirect_uri) throw new OAuth2Exception(ErrorMap.unauthorized_client)

        return {
          grantType,
          token: await options.grants.authorizationCode?.generate({
            get client() {
              return options.getClient(clientId)
            },
            store,
          }),
        }
      }

      if (grantType === 'refresh_token') {
        const {client_id, refresh_token} = data

        return {
          grantType,
          token: await options.grants.refreshToken?.({client_id, refresh_token})!,
        }
      }

      if (grantType === 'password') {
        const {client_id, client_secret, username, password} = data
        return {
          grantType,
          token: await options.grants.password?.({client_id, client_secret, username, password}),
        }
      }

      if (grantType === 'client_credentials') {
        const {client_id, client_secret} = data
        return {
          grantType,
          token: await options.grants.credentials?.({client_id, client_secret}),
        }
      }

      throw new OAuth2Exception(ErrorMap.server_error)
    },
  }
}

Deno.test('Test 442915', async (t) => {
  const app = new Hono() //
  app.onError((e, c) => {
    if (e instanceof OAuth2Exception) {
      return c.json(e, 400)
    }
    throw e
  })

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
  const authCodeStore = new Map<string, {
    code: string
    clientId: string
    redirectUri: string
    codeChallenge: string | null
    codeChallengeMethod: 'S256' | 'plain' | null
    expiresAt: Temporal.Instant
  }>()
  const refreshTokenStore = new Map()

  const server = createOAuth2Server({
    getClient,
    grants: {
      authorizationCode: {
        generate(data) {
          const token = generateToken({refresh: true})
          if (token.refresh_token) refreshTokenStore.set(token.refresh_token, token)
          return token
        },
      },
      refreshToken({refresh_token}) {
        let token = refreshTokenStore.get(refresh_token)
        if (token) {
          refreshTokenStore.delete(refresh_token)
          // new token
          token = generateToken({refresh: true})
          if (token.refresh_token) refreshTokenStore.set(token.refresh_token, token)
          return token
        }

        throw new OAuth2Exception(ErrorMap.access_denied)
      },
      implicit() {
        const token = generateToken()
        return token
      },
      password(data) {
        // console.log({data})
        if (data.username === 'user1' && data.password === 'pass2') {
          return generateToken()
        }
        throw new OAuth2Exception(ErrorMap.access_denied)
      },
      credentials(data) {
        // console.log({data})
        return generateToken()
      },
    },
    storage: {
      async create(data) {
        // console.log('storage save', data)
        authCodeStore.set(data.code, data)
      },
      async get(code) {
        // console.log('storage get', store.get(code))
        return authCodeStore.get(code)!
      },
    },
  })

  app.get('/authorize', async (c) => {
    const uri = new URL(c.req.url)
    const {responseType, authorizeUri} = await server.authorize(uri)
    // console.log({responseType, authorizeUri: authorizeUri.toString()})
    return c.redirect(authorizeUri)
  })
  app.post('/oauth2/token', async (c) => {
    const auth = parseBasicAuth(c.req.header('Authorization'))!
    const {
      grant_type,
      code,
      client_id = auth.username,
      client_secret = auth.password,
      redirect_uri,
      code_verifier: codeVerifier,
      state,
      //
      refresh_token,
      //
      username,
      password,
    } = Object.fromEntries(await c.req.formData()) as Record<string, string>

    // client_id ??= auth.username
    // client_secret ??= auth.password

    if (grant_type === 'authorization_code') {
      const data = await server.token({
        grant_type: 'authorization_code',
        code,
        client_id,
        client_secret,
        codeVerifier,
        state,
      })
      return c.json(data.token)
    }
    if (grant_type === 'refresh_token') {
      const data = await server.token({
        grant_type: 'refresh_token',
        client_id,
        refresh_token,
      })
      return c.json(data.token)
    }
    if (grant_type === 'password') {
      const data = await server.token({
        grant_type: 'password',
        client_id,
        client_secret,
        username,
        password,
      })
      return c.json(data.token)
    }
    if (grant_type === 'client_credentials') {
      const data = await server.token({
        grant_type: 'client_credentials',
        client_id,
        client_secret,
      })
      return c.json(data.token)
    }
  })

  // Client / code
  await t.step('oauth2Authorize() + oauth2ExchangeCode()', async (t) => {
    const {uri: authorizeUri, codeVerifier} = oauth2ClientConfig.pkce
      ? await usePKCE(oauth2Authorize(oauth2ClientConfig))
      : {uri: oauth2Authorize(oauth2ClientConfig)}
    // console.log(authorizeUri.toString())

    // step 1
    const res = await app.request(authorizeUri)
    if (res.status >= 400) return console.log(await res.json())

    const uri = new URL(res.headers.get('location')!)

    // step2 / get token
    const token = await oauth2ExchangeCode(oauth2ClientConfig, {
      fetch: app.request as typeof fetch,
      code: uri.searchParams.get('code')!,
      codeVerifier,
    })
    expect(token.access_token).toBeTruthy()
    expect(token.token_type).toEqual('Bearer')

    const refreshedToken = await oauth2RefreshToken(oauth2ClientConfig, {
      refresh_token: token.refresh_token!,
      fetch: app.request as typeof fetch,
    })
    expect(refreshedToken.access_token).toBeTruthy()
    expect(refreshedToken.token_type).toEqual('Bearer')
  })

  await t.step('oauth2Implicit()', async (t) => {
    const {uri: authorizeUri, codeVerifier} = oauth2ClientConfig.pkce
      ? await usePKCE(oauth2Implicit(oauth2ClientConfig, {state: crypto.randomUUID()}))
      : {uri: oauth2Implicit(oauth2ClientConfig, {state: crypto.randomUUID()})}
    // console.log(authorizeUri.toString())

    // get token
    const res = await app.request(authorizeUri)
    if (res.status >= 400) return console.log(await res.json())

    const uri = new URL(res.headers.get('location')!)
    // console.log(uri.hash)
  })

  await t.step('oauth2Password()', async (t) => {
    const token = await oauth2Password(oauth2ClientConfig, {
      fetch: app.request as typeof fetch,
      username: 'user1',
      password: 'pass2',
    })

    expect(token.access_token).toBeTruthy()
    expect(token.token_type).toEqual('Bearer')
  })

  await t.step('oauth2ClientCredentials()', async (t) => {
    const token = await oauth2ClientCredentials(oauth2ClientConfig, {
      fetch: app.request as typeof fetch,
    })
    expect(token.access_token).toBeTruthy()
    expect(token.token_type).toEqual('Bearer')
  })
})

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
