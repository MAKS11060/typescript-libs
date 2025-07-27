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

//
export interface OAuth2Client {
  /**
   * @default 'confidential'
   */
  type?: 'confidential' | 'public'
  appName: string
  clientId: string
  clientSecret: string
  redirectUri: string[]
}

export interface DefaultCtx {
  sub: string
}

// Storage
interface StorageData<Ctx> {
  ctx: Ctx
  code: string
  clientId: string
  redirectUri: string
  codeChallenge?: string | null
  codeChallengeMethod?: 'S256' | 'plain' | null
  createdAt: Date
}

export interface Storage<Ctx = DefaultCtx> {
  get(code: string): StorageData<Ctx>
  set(data: StorageData<Ctx>): any
}

// App options
interface OAuth2ServerOptions<Ctx = DefaultCtx, Client extends OAuth2Client = OAuth2Client> {
  options?: {
    /**
     * @default (1000 * 60 * 10) // 10 min in milliseconds
     */
    codeTimeout?: number
  }

  // getClient(
  //   {clientId, ctx}: {clientId: string} & (Ctx extends object ? {ctx: Ctx} : {ctx?: Ctx}),
  // ): Promise<Client> | Client | null | undefined
  getClient({clientId}: {clientId: string}): Promise<Client> | Client | null | undefined

  /**
   * @example
   * ```ts
   * generateCode() {
   *   return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
   * }
   * ```
   */
  generateCode?({client}: {client: OAuth2Client}): string

  /**
   * Store `code` and metadata for grant `authorization_code`
   */
  storage: Storage<Ctx>

  /**
   * OAuth2 Grant handler:
   * - `authorizationCode`
   * - `refreshToken`
   * - `implicit`
   * - `password`
   * - `credentials`
   */
  grants: {
    authorizationCode?({client, store}: {client: Client; store: StorageData<Ctx>}): Promise<OAuth2TokenResponse>

    implicit?({client}: {client: Client}): Promise<OAuth2TokenResponse>

    password?(data: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }): Promise<OAuth2TokenResponse>

    credentials?(data: {client_id: string; client_secret: string}): Promise<OAuth2TokenResponse>

    refreshToken?({client_id, refresh_token}: {client_id: string; refresh_token: string}): Promise<OAuth2TokenResponse>
  }
}

// App
interface OAuth2Server<
  Ctx /* extends object */ = DefaultCtx,
  Client extends OAuth2Client = OAuth2Client,
  Options = OAuth2ServerOptions<Ctx, Client>,
> {
  authorize(options: {uri: URL | string} & (Ctx extends object ? {ctx: Ctx} : {ctx?: Ctx})): Promise<{
    responseType: 'code' | 'token'
    authorizeUri: URL
    client: Client
  }>

  token(data: OAuth2GrantTypeAuthorizationCode): Promise<OAuth2TokenResponse<GetGrant<Options, 'authorizationCode'>>>
  token(data: OAuth2GrantTypeRefresh): Promise<OAuth2TokenResponse<GetGrant<Options, 'refreshToken'>>>
  token(data: OAuth2GrantTypeCredentials): Promise<OAuth2TokenResponse<GetGrant<Options, 'credentials'>>>
  token(data: OAuth2GrantTypePassword): Promise<OAuth2TokenResponse<GetGrant<Options, 'password'>>>
}

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

type GetGrant<T, G extends string> = T extends {grants: { [K in G]: (...args: any[]) => infer O }}
  ? O extends Promise<infer P> ? P : O
  : never

// impl
const createOauth2Server = <
  Ctx /* extends object */ = DefaultCtx,
  Client extends OAuth2Client = OAuth2Client,
  Options = OAuth2ServerOptions<Ctx, Client>,
>(
  options: OAuth2ServerOptions<Ctx, Client>,
): OAuth2Server<Ctx, Client, Options> => {
  options.options ??= {}
  options.options.codeTimeout ??= CODE_EXPIRED_TIME

  options.generateCode ??= () => encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))

  return {
    async authorize({uri, ctx}) {
      // to URL
      uri = typeof uri === 'string' ? new URL(uri) : uri

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

      const client = await options.getClient({clientId})
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
          ctx: ctx!,
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

      const client = await options.getClient({clientId: client_id})
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
        const isExpired = Date.now() - createdAt.getTime() > options.options?.codeTimeout!
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

Deno.test('Test 261007', async (t) => {
  // 1
  const app1 = createOauth2Server({
    getClient: ({clientId}) => ({} as any),
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
  const createStorage = (): Storage<{test: string}> => {
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
    getClient: ({clientId}) => ({} as any),
    storage: createStorage(),
    grants: {},
  })
  app2.authorize({uri: new URL(''), ctx: {test: ''}})

  // 3
  const app3 = createOauth2Server<{a: 'global'}>({
    getClient: ({clientId}) => ({} as any),
    storage: {} as any, //as Storage<{a: 'local'}>,
    grants: {},
  })
  app3.authorize({uri: new URL(''), ctx: {a: 'global'}})

  // 4
  const app4 = createOauth2Server<DefaultCtx & {a: 'global'}, OAuth2Client & {prop: string}>({
    getClient: ({clientId}) => ({} as any),
    storage: {} as any, //as Storage<{a: 'local'}>,// err ok
    grants: {},
  })
  const a4 = await app4.authorize({uri: new URL(''), ctx: {sub: '', a: 'global'}})
  a4.client.prop satisfies string

  // 5 remove ctx
  createOauth2Server({} as any).authorize({uri: '', ctx: {sub: ''}})
  createOauth2Server<unknown>({} as any).authorize({uri: ''})
})
