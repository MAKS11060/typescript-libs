import { Client } from '@maks11060/oauth2'
import { expect } from 'jsr:@std/expect/expect'
import { ErrorMap } from '../error.ts'
import { parseTokenRequest } from './adapter/web.ts'
import { createOauth2Server, DefaultCtx, OAuth2Client, OAuth2Storage, OAuth2StorageData } from './server.ts'

Deno.test('createOauth2Server()', async (t) => {
  const redirectUri = 'http://localhost/oauth2/callback'
  const clients: OAuth2Client[] = [
    {appName: 'app1', clientId: '1', clientSecret: 'SECRET', redirectUri: [redirectUri]},
    {type: 'confidential', appName: 'app2', clientId: '2', clientSecret: 'SECRET', redirectUri: [redirectUri]},
    {type: 'public', appName: 'app3', clientId: '3', clientSecret: 'SECRET', redirectUri: [redirectUri]},
  ] as const

  await t.step('without grants', async (t) => {
    const store = new Map<string, OAuth2StorageData>()
    const oauth2Server = createOauth2Server({
      getClient: (clientId) => clients.find((client) => client.clientId === clientId),
      storage: store,
      grants: {},
    })

    await t.step('authorize()', async (t) => {
      await expect(
        oauth2Server.authorize({uri: 'https://localhost/authorize', ctx: {sub: 'user1'}}),
      ).rejects.toThrow(ErrorMap.invalid_request)
      await expect(
        oauth2Server.authorize({uri: 'https://localhost/authorize?response_type=code', ctx: {sub: 'user1'}}),
      ).rejects.toThrow(ErrorMap.unsupported_response_type)
      await expect(
        oauth2Server.authorize({uri: 'https://localhost/authorize?response_type=token', ctx: {sub: 'user1'}}),
      ).rejects.toThrow(ErrorMap.unsupported_response_type)
    })

    await t.step('token()', async (t) => {
      await expect(oauth2Server.token({} as any)).rejects.toThrow(ErrorMap.unsupported_grant_type)

      await expect(
        oauth2Server.token({grant_type: 'authorization_code', client_id: '1', code: ''}),
      ).rejects.toThrow(ErrorMap.unsupported_grant_type)

      await expect(
        oauth2Server.token({grant_type: 'client_credentials', client_id: '1', client_secret: '1'}),
      ).rejects.toThrow(ErrorMap.unsupported_grant_type)

      await expect(oauth2Server.token({
        grant_type: 'password',
        client_id: '1',
        client_secret: '1',
        username: 'user1',
        password: 'pass1',
      })).rejects.toThrow(ErrorMap.unsupported_grant_type)
      await expect(
        oauth2Server.token({grant_type: 'refresh_token', client_id: '1', refresh_token: 'rt1'}),
      ).rejects.toThrow(ErrorMap.unsupported_grant_type)
    })
  })

  await t.step('with grants', async (t) => {
    const store = new Map<string, OAuth2StorageData>()
    const oauth2Server = createOauth2Server({
      getClient: (clientId) => clients.find((client) => client.clientId === clientId),
      generateCode: ({client}) => 'CODE',
      storage: store,
      grants: {
        authorizationCode({client, store}) {
          if (client.clientId !== '1') return
          return {access_token: 'at:1', token_type: 'Bearer', refresh_token: 'rt1'}
        },
        refreshToken({client_id, refresh_token}) {
          if (client_id !== '1') return
          if (refresh_token !== 'rt1') return
          return {access_token: 'at:2', token_type: 'Bearer', refresh_token: 'rt2'}
        },
        //
        implicit({client}) {
          return {access_token: 'at:3', token_type: 'Bearer', refresh_token: 'rt3'}
        },
        credentials(params) {
          return {access_token: 'at:4', token_type: 'Bearer', refresh_token: 'rt4'}
        },
        password(params) {
          return {access_token: 'at:5', token_type: 'Bearer', refresh_token: 'rt5'}
        },
      },
    })

    await t.step('authorize() err', async (t) => {
      await expect(
        oauth2Server.authorize({uri: 'https://localhost/authorize', ctx: {sub: 'user1'}}),
      ).rejects.toThrow(ErrorMap.invalid_request)
      await expect(
        oauth2Server.authorize({uri: 'https://localhost/authorize?response_type=code', ctx: {sub: 'user1'}}),
      ).rejects.toThrow(ErrorMap.invalid_request)
      await expect(
        oauth2Server.authorize({uri: 'https://localhost/authorize?response_type=token', ctx: {sub: 'user1'}}),
      ).rejects.toThrow(ErrorMap.invalid_request)
    })

    await t.step('token()', async (t) => {
      const client = clients[0]
      await expect(oauth2Server.token({} as any)).rejects.toThrow(ErrorMap.unsupported_grant_type)

      await expect(
        oauth2Server.token({grant_type: 'authorization_code', client_id: client.clientId, code: ''}),
      ).rejects.toThrow(ErrorMap.invalid_request)

      await expect(
        oauth2Server.token({grant_type: 'refresh_token', client_id: client.clientId, refresh_token: 'rt0'}),
      ).rejects.toThrow(ErrorMap.server_error)
    })

    await t.step('authorize() authorizationCode + refreshToken', async (t) => {
      const client = clients[0]
      const state = crypto.randomUUID()
      const clientConfig = {
        clientId: client.clientId,
        authorizeUri: 'https://example.com/authorize',
        tokenUri: 'https://example.com/oauth2/token',
        clientSecret: client.clientSecret,
        redirectUri: client.redirectUri[0],
      }

      // 1. generate authorize link
      const uri = Client.oauth2Authorize(clientConfig, {state})

      // 2. get auth code using authorize link
      const authorizationLink = await oauth2Server.authorize({uri, ctx: {sub: 'user1'}})

      // 3. get token using code
      const token = await Client.oauth2ExchangeCode(clientConfig, {
        code: authorizationLink.authorizeUri.searchParams.get('code')!,
        // Server
        fetch: async (input, init) => {
          const params = await parseTokenRequest(new Request(input, init))
          const {token} = await oauth2Server.token(params)
          return Response.json(token)
        },
      })
      expect(token).toEqual({access_token: 'at:1', token_type: 'Bearer', refresh_token: 'rt1'})

      // 4. refresh token
      const token2 = await Client.oauth2RefreshToken(clientConfig, {
        refresh_token: token.refresh_token!,
        // Server
        fetch: async (input, init) => {
          const params = await parseTokenRequest(new Request(input, init))
          const {token} = await oauth2Server.token(params)
          return Response.json(token)
        },
      })
      expect(token2).toEqual({access_token: 'at:2', token_type: 'Bearer', refresh_token: 'rt2'})
    })

    await t.step('authorize() implicit', async (t) => {
      const client = clients[0]
      const state = crypto.randomUUID()
      const clientConfig = {
        clientId: client.clientId,
        authorizeUri: 'https://example.com/authorize',
        tokenUri: 'https://example.com/oauth2/token',
        clientSecret: client.clientSecret,
        redirectUri: client.redirectUri[0],
      }

      // 1. generate authorize link
      const uri = Client.oauth2Implicit(clientConfig, {state})

      // 2. get token using authorize link
      const data = await oauth2Server.authorize({uri, ctx: {sub: 'user1'}})
      const token = Client.parseAuthorizationResponse(data.authorizeUri)
      expect(token).toEqual({access_token: 'at:3', token_type: 'Bearer', state})
    })

    await t.step('token() client_credentials', async (t) => {
      const client = clients[0]
      expect(
        await oauth2Server.token({
          grant_type: 'client_credentials',
          client_id: client.clientId,
          client_secret: client.clientSecret,
        }),
      ).toEqual({
        grantType: 'client_credentials',
        token: {access_token: 'at:4', refresh_token: 'rt4', token_type: 'Bearer'},
      })
    })

    await t.step('token() password', async (t) => {
      const client = clients[0]
      expect(
        await oauth2Server.token({
          grant_type: 'password',
          client_id: client.clientId,
          client_secret: client.clientSecret,
          username: 'user1',
          password: 'pass1',
        }),
      ).toEqual({
        grantType: 'password',
        token: {access_token: 'at:5', refresh_token: 'rt5', token_type: 'Bearer'},
      })
    })
  })
})

// types only
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
