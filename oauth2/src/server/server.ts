import { encodeBase64Url } from '@std/encoding/base64url'
import { ErrorMap, OAuth2Exception } from '../error.ts'
import { OAuth2TokenResponse } from '../oauth2.ts'
import { PkceChallenge, pkceVerify } from '../pkce.ts'
import { getClientRedirectUri, isGrantType, isResponseType } from './helper.ts'

const RESPONSE_TYPE = 'response_type'
const CODE = 'code'
const STATE = 'state'
const CLIENT_ID = 'client_id'
const CLIENT_SECRET = 'client_secret'
const REDIRECT_URI = 'redirect_uri'

const CODE_CHALLENGE = 'code_challenge'
const CODE_CHALLENGE_METHOD = 'code_challenge_method'

const CODE_EXPIRED_TIME = 1000 * 60 * 10 // 10 min

type GetStorageData<T> = T extends {storage: {create(data: OAuth2StorageData<infer O>): any}} ? O : never
type GetGrant<T, G extends string> = T extends {grants: { [K in G]: (...args: any[]) => infer O }} ? ExtractPromise<O>
  : never

type ExtractPromise<T> = T extends Promise<infer O> ? O : T

//
export interface OAuth2AppConfig {
  /**
   * @default 'confidential'
   */
  type?: 'confidential' | 'public'
  appName: string
  clientId: string
  clientSecret: string
  redirectUri: string[]
}

interface DefaultCtx {
  /** `Subject` - any identification used to identify the user */
  sub: string
}

export interface OAuth2StorageData<Ctx = DefaultCtx> {
  ctx?: Ctx
  code: string
  clientId: string
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: 'S256' | 'plain' | null
  createdAt: Date
}

export interface OAuth2Storage<in out Ctx> {
  set(data: OAuth2StorageData<Ctx>): Promise<void> | void | unknown
  get(code: string): Promise<OAuth2StorageData<Ctx> | null | undefined> | void
}

// token()
export type OAuth2GrantTypeAuthorizationCode = {
  grant_type: 'authorization_code'
  code: string
  client_id: string
  client_secret: string
  redirect_uri?: string
  code_verifier?: string
  state?: string
}
export type OAuth2GrantTypeRefresh = {
  grant_type: 'refresh_token'
  client_id: string
  refresh_token: string
}
export type OAuth2GrantTypeCredentials = {
  grant_type: 'client_credentials'
  client_id: string
  client_secret: string
}
export type OAuth2GrantTypePassword = {
  grant_type: 'password'
  client_id: string
  client_secret: string
  username: string
  password: string
}
export type OAuth2GrantType =
  | OAuth2GrantTypeAuthorizationCode
  | OAuth2GrantTypeRefresh
  | OAuth2GrantTypeCredentials
  | OAuth2GrantTypePassword

interface OAuth2ServerOptions<Ctx extends object> {
  getClient(clientId: string): Promise<OAuth2AppConfig> | OAuth2AppConfig | undefined | null | void

  /**
   * @example
   * ```ts
   * generateCode() {
   *   return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
   * }
   * ```
   */
  generateCode?(data: {client: OAuth2AppConfig}): string

  storage: OAuth2Storage<Ctx>

  grants: {
    authorizationCode?(data: {
      client: OAuth2AppConfig
      store: OAuth2StorageData<Ctx>
    }): Promise<OAuth2TokenResponse>

    implicit?(data: {
      client: OAuth2AppConfig
    }): Promise<OAuth2TokenResponse>

    password?(data: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }): Promise<OAuth2TokenResponse>

    credentials?(data: {
      client_id: string
      client_secret: string
    }): Promise<OAuth2TokenResponse>

    refreshToken?(data: {
      client_id: string
      refresh_token: string
    }): Promise<OAuth2TokenResponse>
  }
}

interface OAuth2ServerApp<Ctx extends object, Options extends OAuth2ServerOptions<Ctx>> {
  authorize(uri: URL, ctx?: Ctx): Promise<{
    responseType: 'code' | 'token'
    authorizeUri: URL
    client: OAuth2AppConfig
  }>

  token(data: OAuth2GrantTypeAuthorizationCode): Promise<OAuth2TokenResponse<GetGrant<Options, 'authorizationCode'>>>
  token(data: OAuth2GrantTypeRefresh): Promise<OAuth2TokenResponse<GetGrant<Options, 'refreshToken'>>>
  token(data: OAuth2GrantTypeCredentials): Promise<OAuth2TokenResponse<GetGrant<Options, 'credentials'>>>
  token(data: OAuth2GrantTypePassword): Promise<OAuth2TokenResponse<GetGrant<Options, 'password'>>>
}

export const createOAuth2Server = <
  Ctx extends object = DefaultCtx,
  Options extends OAuth2ServerOptions<Ctx> = OAuth2ServerOptions<Ctx>,
>(options: Options): OAuth2ServerApp<Ctx, Options> => {
  options.generateCode ??= () => {
    return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  }

  return {
    async authorize(uri, ctx) {
      // response_type
      const responseType = uri.searchParams.get(RESPONSE_TYPE)
      if (!isResponseType(responseType)) throw new OAuth2Exception(ErrorMap.invalid_request, 'Invalid response_type')

      if (
        (responseType === 'code' && !options.grants?.authorizationCode) ||
        (responseType === 'token' && !options.grants?.implicit)
      ) throw new OAuth2Exception(ErrorMap.unsupported_response_type)

      // client_id
      const clientId = uri.searchParams.get(CLIENT_ID)!
      if (!clientId) throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing client_id')

      const client = await options.getClient(clientId)
      if (!client) throw new OAuth2Exception(ErrorMap.unauthorized_client)

      // redirect_uri
      const clientRedirectUri = uri.searchParams.get(REDIRECT_URI)
      const redirectUri = getClientRedirectUri(client, clientRedirectUri)

      // PKCE
      const codeChallenge = uri.searchParams.get(CODE_CHALLENGE)
      const codeChallengeMethod = uri.searchParams.get(CODE_CHALLENGE_METHOD) as PkceChallenge['codeChallengeMethod']

      if (codeChallenge) {
        if (codeChallengeMethod !== 'S256' && codeChallengeMethod !== 'plain') {
          throw new OAuth2Exception(ErrorMap.invalid_request, 'Invalid code_challenge_method')
        }
      } else if (client.type === 'public') {
        if (!codeChallenge && !codeChallengeMethod) {
          throw new OAuth2Exception(
            ErrorMap.invalid_request,
            'Public clients must use PKCE (code_challenge and code_challenge_method)',
          )
        }
      }

      // callback uri
      const authorizeUri = new URL(redirectUri)

      // results
      if (responseType === 'code') {
        // generate code
        const code = options.generateCode!({client})

        // save to storage
        await options.storage.set({
          ctx,
          code,
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          createdAt: new Date(),
        })

        // redirectUri? code + state
        authorizeUri.searchParams.set(CODE, code)
        const state = uri.searchParams.get(STATE)
        state && authorizeUri.searchParams.set(STATE, state)

        return {responseType, authorizeUri, client, ctx}
      }

      if (responseType === 'token') {
        const token = await options.grants.implicit?.({client})
        if (!token) throw new OAuth2Exception(ErrorMap.server_error)

        const body = new URLSearchParams()
        body.set('access_token', token.access_token)
        body.set('token_type', token.token_type)
        body.set('expires_in', String(token.expires_in))
        if (token.scope) body.set('scope', token.scope)

        // PKCE / optional
        // if (codeChallenge && codeChallengeMethod) {
        //   codeChallenge && body.set('code_challenge', codeChallenge)
        //   codeChallengeMethod && body.set('code_challenge_method', codeChallengeMethod)
        // }

        // state
        const state = uri.searchParams.get(STATE)
        state && body.set(STATE, state)

        authorizeUri.hash = body.toString()

        return {responseType, authorizeUri, client, ctx}
      }

      throw new OAuth2Exception(ErrorMap.unsupported_response_type)
    },

    async token(data: OAuth2GrantType): Promise<any> {
      const {grant_type: grantType, client_id} = data

      if (!isGrantType(grantType)) throw new OAuth2Exception(ErrorMap.unsupported_grant_type)
      if (
        (grantType === 'authorization_code' && !options.grants?.authorizationCode) ||
        (grantType === 'refresh_token' && !options.grants?.refreshToken) ||
        (grantType === 'password' && !options.grants?.password) ||
        (grantType === 'client_credentials' && !options.grants?.credentials)
      ) throw new OAuth2Exception(ErrorMap.unsupported_grant_type)

      // required parameters
      if (!client_id) throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing client_id')

      const client = await options.getClient(client_id)
      if (!client) throw new OAuth2Exception(ErrorMap.unauthorized_client)

      if (grantType === 'authorization_code') {
        const {code, redirect_uri, code_verifier: codeVerifier, client_secret} = data

        // check code
        if (!code) throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing authorization code')

        const store = await options.storage.get(code)
        if (!store) throw new OAuth2Exception(ErrorMap.invalid_grant, 'Invalid authorization code')

        const { // from store
          createdAt,
          codeChallenge,
          codeChallengeMethod,
          clientId: clientIdInStore,
          redirectUri: redirectUriInStore,
        } = store

        // checking if the code has expired
        const isExpired = Date.now() - createdAt.getTime() > CODE_EXPIRED_TIME
        if (isExpired) throw new OAuth2Exception(ErrorMap.invalid_grant, 'Authorization code expired')

        // client check
        if (client_id !== clientIdInStore) throw new OAuth2Exception(ErrorMap.unauthorized_client, 'Client ID mismatch')

        // redirectUri(code) === redirectUri(authorization_code)
        if (redirectUriInStore && redirectUriInStore !== redirect_uri) {
          throw new OAuth2Exception(ErrorMap.invalid_request, 'Mismatch redirect_uri')
        }

        // client secret check
        if (!client.type || client.type === 'confidential') {
          if (!client_secret) {
            throw new OAuth2Exception(ErrorMap.invalid_client, 'Client secret required')
          }
          if (client_secret !== client.clientSecret) {
            throw new OAuth2Exception(ErrorMap.invalid_client, 'Invalid client secret')
          }
        } else if (client.type === 'public') {
          if (client_secret !== undefined) {
            throw new OAuth2Exception(ErrorMap.invalid_client, 'Public clients must not include client_secret')
          }
        }

        // PKCE
        // required pkce for public client
        if (client.type === 'public' && (!codeChallenge || !codeChallengeMethod)) {
          throw new OAuth2Exception(
            ErrorMap.invalid_request,
            'Public clients must use PKCE (code_challenge and code_verifier)',
          )
        }

        // if pkce was used for at the beginning of authorization
        if (codeChallenge && codeChallengeMethod) {
          if (!codeVerifier) {
            throw new OAuth2Exception(ErrorMap.invalid_grant, 'Code verifier required')
          }
          if (!(await pkceVerify({codeChallenge, codeChallengeMethod, codeVerifier}))) {
            throw new OAuth2Exception(ErrorMap.invalid_grant, 'Code verifier does not match')
          }
        }

        return {
          grantType,
          token: await options.grants.authorizationCode?.({client, store}),
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

Deno.test('Test 379603', async (t) => {
  const store = new Map<string, OAuth2StorageData>()

  // const createStorage = (): OAuth2Storage<{test: string}> => {
  // const store = new Map<string, any>()
  //   return {
  //     set: async (data) => store.set(data.code, data),
  //     get: async (code) => store.get(code),
  //   }
  // }

  // const server2 = createOAuth2Server({
  //   storage: createStorage(),
  //   grants: {},
  //   getClient: () => {},
  // })

  const server = createOAuth2Server({
    storage: {
      set: async (data) => store.set(data.code, data),
      get: async (code) => store.get(code),
    },
    grants: {
      async authorizationCode({client, store}) {
        return {
          access_token: '1',
          token_type: 'Bearer',
          refresh_token: '1',
          expires_in: 3600,
        }
      },
      refreshToken({client_id, refresh_token}) {
      },
    },
    getClient: (clientId) => {
      const clients: OAuth2AppConfig[] = [
        {appName: 'Test 1', clientId: '1', clientSecret: '1', redirectUri: ['https://localhost/callback']},
      ]
      return clients.find((v) => v.clientId === clientId)
    },
  })

  await server.authorize(new URL(''), {sub: '123'})

  const a = await server.token({grant_type: 'authorization_code', client_id: '1', client_secret: '1', code: '1'})
  const refresh = await server.token({grant_type: 'refresh_token', client_id: '1', refresh_token: 't1'})
})
