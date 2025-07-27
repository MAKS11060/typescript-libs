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
import { createOauth2Server, DefaultCtx, OAuth2Client, OAuth2Storage, OAuth2StorageData } from './server.ts'

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

Deno.test('Test 261007', {ignore: true}, async (t) => {
  // 1
  const app1 = createOauth2Server({
    getClient: (clientId) => ({} as any),
    storage: {
      get: (code) => ({code: '', ctx: {sub: ''}} as any),
      set(data) {},
    },
    grants: {
      async authorizationCode({store}) {
        store.ctx
        return {} as any
      },
    },
  })
  app1.authorize({uri: new URL(''), ctx: {sub: ''}})

  // 2
  const createStorage = (): OAuth2Storage<{test: string}> => {
    return {
      get: (code) => ({
        ctx: {test: ''},
        code: '',
        clientId: '',
        redirectUri: '',
        createdAt: new Date(),
      }),
      set(data) {},
    }
  }
  const app2 = createOauth2Server({
    getClient: (clientId) => ({} as any),
    storage: createStorage(),
    grants: {},
  })

  app2.authorize({uri: new URL(''), ctx: {test: ''}})

  // 3
  const app3 = createOauth2Server<{a: 'global'}>({
    getClient: (clientId) => ({} as any),
    storage: {} as any, //as Storage<{a: 'local'}>,
    grants: {},
  })
  app3.authorize({uri: new URL(''), ctx: {a: 'global'}})

  // 4
  const app4 = createOauth2Server<DefaultCtx & {a: 'global'}, OAuth2Client & {prop: string}>({
    getClient: (clientId) => ({} as any),
    storage: {} as any, //as Storage<{a: 'local'}>,// err ok
    grants: {},
  })
  const a4 = await app4.authorize({uri: new URL(''), ctx: {sub: '', a: 'global'}})
  a4.client.prop satisfies string

  // 5 remove ctx
  createOauth2Server({} as any).authorize({uri: '', ctx: {sub: ''}})
  createOauth2Server<unknown>({} as any).authorize({uri: ''})
})

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
  const createStore = (): OAuth2Storage => {
    const authCodeStore = new Map<string, OAuth2StorageData>()
    return {
      set: (data) => authCodeStore.set(data.code, data),
      get: (code) => authCodeStore.get(code),
      // set: async (data) => authCodeStore.set(data.code, data),
      // get: async (code) => authCodeStore.get(code),
    }
  }
  const refreshTokenStore = new Map()

  const server = createOauth2Server({
    getClient,
    storage: createStore(),
    grants: {
      async authorizationCode({client, store}) {
        const token = generateToken({refresh: true})
        if (token.refresh_token) refreshTokenStore.set(token.refresh_token, token)
        return token
      },
      async refreshToken({refresh_token}) {
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
      async implicit() {
        const token = generateToken()
        return token
      },
      async password(data) {
        // console.log({data})
        if (data.username === 'user1' && data.password === 'pass2') {
          return generateToken()
        }
        throw new OAuth2Exception(ErrorMap.access_denied)
      },
      async credentials(data) {
        // console.log({data})
        return generateToken()
      },
    },
  })

  app.get('/authorize', async (c) => {
    const uri = new URL(c.req.url)
    const {responseType, authorizeUri} = await server.authorize({uri, ctx: {sub: 'user1'}})
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

Deno.test('Test 433117', async (t) => {
  const oauth2Server = createOauth2Server({
    getClient(clientId) {},
    storage: {} as any,
    grants: {
      async authorizationCode({client, store}) {
        return {access_token: '', token_type: '', prop: ''}
      },
    },
  })

  const t2 = await oauth2Server.token({grant_type: 'authorization_code', code: '', client_id: ''})
  t2.prop satisfies string
})

Deno.test('Test 607832', async (t) => {
  const store = new Map<string, OAuth2StorageData>()
  const clients: OAuth2Client[] = [
    {
      appName: 'My App',
      clientId: '1',
      clientSecret: '1',
      redirectUri: ['http://localhost/oauth2/callback'],
    },
  ]

  createOauth2Server({
    getClient(clientId) {
      return clients.find((client) => client.clientId === clientId)
    },
    storage: {
      set: (data) => store.set(data.code, data),
      get: (code) => store.get(code),
    },
    grants: {
      async authorizationCode({client, store}) {
        return {
          access_token: crypto.randomUUID(),
          token_type: 'Bearer',
        }
      },
    },
  })
})
