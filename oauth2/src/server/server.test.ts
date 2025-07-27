import {
  ErrorMap,
  oauth2Authorize,
  OAuth2ClientConfig,
  oauth2ClientCredentials,
  OAuth2Exception,
  oauth2ExchangeCode,
  oauth2Implicit,
  oauth2Password,
  oauth2RefreshToken,
  usePKCE,
} from '@maks11060/oauth2'
import { Hono } from 'hono'
import { expect } from 'jsr:@std/expect/expect'
import { generateToken, parseBasicAuth } from './helper.ts'
import { createOAuth2Server, OAuth2Client, OAuth2StorageData } from './server.ts'

export const getClient = (clientId: string): OAuth2Client => {
  const redirectUri = 'http://localhost/oauth2/callback'
  const apps: OAuth2Client[] = [
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
  const authCodeStore = new Map<string, OAuth2StorageData>()
  const refreshTokenStore = new Map()

  const server = createOAuth2Server({
    getClient,
    grants: {
      authorizationCode(data) {
        const token = generateToken({refresh: true})
        if (token.refresh_token) refreshTokenStore.set(token.refresh_token, token)
        return token
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
      async set(data) {
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
        code_verifier: codeVerifier,
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
