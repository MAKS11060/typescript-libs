import { OAuth2Exception, OAuth2TokenResponse, PkceChallenge, pkceVerify } from '@maks11060/oauth2'
import { encodeBase64Url } from '@std/encoding/base64url'
import { ErrorMap } from '../error.ts'
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

export interface OAuth2AppConfig {
  type?: 'confidential' | 'public'
  appName: string
  clientId: string
  clientSecret: string
  redirectUri: string[]
}

export interface OAuth2StorageData<T = unknown> {
  data?: T
  code: string
  clientId: string
  redirectUri: string
  codeChallenge: string | null
  codeChallengeMethod: 'S256' | 'plain' | null
  createdAt: Date
}

interface OAuth2ServerOptions {
  getClient(clientId: string): OAuth2AppConfig
  /**
   * @example
   * ```ts
   * generateCode() {
   *   return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
   * }
   * ```
   */
  generateCode?(data: {client: OAuth2AppConfig}): string
  storage: {
    create(data: OAuth2StorageData<{sub: string}>): Promise<void> | void
    get(code: string): Promise<OAuth2StorageData<{sub: string}> | undefined> | void
  }
  grants: {
    authorizationCode?(data: {
      client: OAuth2AppConfig
      store: OAuth2StorageData
    }): toPromise<OAuth2TokenResponse | {}>

    refreshToken?(data: {
      client_id: string
      refresh_token: string
    }): toPromise<OAuth2TokenResponse | {}>

    implicit?(data: {
      client: OAuth2AppConfig
    }): toPromise<OAuth2TokenResponse & {}>
    // }): toPromise<OAuth2TokenResponse<{}>>

    password?(data: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }): toPromise<OAuth2TokenResponse | {}>

    credentials?(data: {
      client_id: string
      client_secret: string
    }): toPromise<OAuth2TokenResponse | {}>
  }
}

type toPromise<T> = Promise<T> | T
type GetStorageData<T> = T extends {
  storage: {
    create(data: OAuth2StorageData<infer O>): any
  }
} ? O
  : never

type GetGrant<T, G extends string> = T extends {
  grants: { [K in G]: (...args: any[]) => infer O }
} ? ExtractPromise<O>
  : never

type ExtractPromise<T> = T extends Promise<infer O> ? O : T

type OAuth2ServerToken_code = {
  grant_type: 'authorization_code'
  code: string
  client_id: string
  client_secret: string
  redirect_uri?: string
  code_verifier?: string
  state?: string
}
type OAuth2ServerToken_refresh = {
  grant_type: 'refresh_token'
  client_id: string
  refresh_token: string
}
type OAuth2ServerToken_cred = {
  grant_type: 'client_credentials'
  client_id: string
  client_secret: string
}
type OAuth2ServerToken_password = {
  grant_type: 'password'
  client_id: string
  client_secret: string
  username: string
  password: string
}
type OAuth2ServerToken =
  | OAuth2ServerToken_code
  | OAuth2ServerToken_refresh
  | OAuth2ServerToken_cred
  | OAuth2ServerToken_password

interface OAuth2ServerApp<T extends OAuth2ServerOptions> {
  authorizeCheck(): void
  authorize(uri: URL, data?: GetStorageData<T>): Promise<
    | {responseType: 'code'; authorizeUri: URL}
    | {responseType: 'token'; authorizeUri: URL}
  >
  token(data: OAuth2ServerToken_code): Promise<OAuth2TokenResponse<GetGrant<T, 'authorizationCode'>>>
  token(data: OAuth2ServerToken_refresh): Promise<OAuth2TokenResponse<GetGrant<T, 'refreshToken'>>>
  token(data: OAuth2ServerToken_cred): Promise<OAuth2TokenResponse<GetGrant<T, 'credentials'>>>
  token(data: OAuth2ServerToken_password): Promise<OAuth2TokenResponse<GetGrant<T, 'password'>>>
}

export const createOAuth2Server = <T extends OAuth2ServerOptions>(options: T): OAuth2ServerApp<T> => {
  options.generateCode ??= () => {
    return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  }

  return {
    authorizeCheck() {},

    async authorize(uri, data) {
      // response_type
      const responseType = uri.searchParams.get(RESPONSE_TYPE)
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
      const codeChallenge = uri.searchParams.get(CODE_CHALLENGE)
      const codeChallengeMethod = uri.searchParams.get(CODE_CHALLENGE_METHOD) as PkceChallenge['codeChallengeMethod']
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
        const code = options.generateCode!({client})
        authorizeUri.searchParams.set(CODE, code)

        // external storage
        await options.storage.create({
          data,
          code,
          clientId,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          createdAt: new Date(),
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
          codeChallengeMethod &&
            body.set('code_challenge_method', codeChallengeMethod)
        }

        // state
        const state = uri.searchParams.get(STATE)
        state && body.set(STATE, state)

        authorizeUri.hash = body.toString() // ? or encodeURIComponent(body.toString())

        return {responseType, authorizeUri}
      }

      throw new OAuth2Exception(ErrorMap.unsupported_response_type)
    },

    async token(data: OAuth2ServerToken): Promise<any> {
      const grantType = data.grant_type
      if (!isGrantType(grantType)) {
        throw new OAuth2Exception(ErrorMap.unsupported_grant_type)
      }
      if (
        (grantType === 'authorization_code' && !options.grants?.authorizationCode) ||
        (grantType === 'refresh_token' && !options.grants?.refreshToken) ||
        (grantType === 'password' && !options.grants?.password) ||
        (grantType === 'client_credentials' && !options.grants?.credentials)
      ) throw new OAuth2Exception(ErrorMap.unsupported_grant_type)

      const client = await options.getClient(data.client_id)

      if (grantType === 'authorization_code') {
        const store = await options.storage.get(data.code)!
        if (!store) throw new OAuth2Exception(ErrorMap.access_denied)

        const { // input
          code_verifier: codeVerifier,
          client_id,
          client_secret,
        } = data

        const { // from store
          createdAt,
          codeChallenge,
          codeChallengeMethod,
          clientId,
          redirectUri,
        } = store

        // checking if the code has expired
        const isExpired = createdAt.getTime() > Date.now() - CODE_EXPIRED_TIME
        if (isExpired) throw new OAuth2Exception(ErrorMap.invalid_request, 'Code is expired')

        // PKCE / if pkce was used for at the beginning of authorization
        if (codeChallenge && codeChallengeMethod) {
          if (!codeVerifier || !await pkceVerify({codeChallenge, codeChallengeMethod, codeVerifier})) {
            throw new OAuth2Exception(ErrorMap.invalid_grant, 'Code verifier does not match')
          }
        }

        // client check
        if (client_id !== clientId) throw new OAuth2Exception(ErrorMap.unauthorized_client)
        if (client_secret !== client.clientSecret) throw new OAuth2Exception(ErrorMap.unauthorized_client)

        // redirectUri(code) === redirectUri(authorization_code)
        if (redirectUri && redirectUri !== data.redirect_uri) {
          throw new OAuth2Exception(ErrorMap.access_denied, 'Mismatch redirect_uri')
        }

        return {
          grantType,
          token: await options.grants.authorizationCode?.({
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
          token: await options.grants.refreshToken?.({
            client_id,
            refresh_token,
          })!,
        }
      }

      if (grantType === 'password') {
        const {client_id, client_secret, username, password} = data
        return {
          grantType,
          token: await options.grants.password?.({
            client_id,
            client_secret,
            username,
            password,
          }),
        }
      }

      if (grantType === 'client_credentials') {
        const {client_id, client_secret} = data
        return {
          grantType,
          token: await options.grants.credentials?.({
            client_id,
            client_secret,
          }),
        }
      }

      throw new OAuth2Exception(ErrorMap.server_error)
    },
  }
}

const createStorageInMemory = () => {
  const authCodeStore = new Map<string, OAuth2StorageData<{sub: string}>>()
  return {
    store: authCodeStore,
    create(data: OAuth2StorageData<{sub: string}>) {
      authCodeStore.set(data.code, data)
    },
    async get(code: string) {
      return authCodeStore.get(code)
    },
  }
}

const server = createOAuth2Server({
  getClient: () => ({} as any),
  storage: createStorageInMemory(),
  grants: {
    async refreshToken(data) {
      return {
        access_token: '',
        token_type: '',
        refresh_token: '1',
        das: 1,
      }
    },
  },
})

await server.authorize(new URL(''), {sub: '123'})

const a = await server.token({grant_type: 'authorization_code', client_id: '1', client_secret: '1', code: '1'})
const refresh = await server.token({grant_type: 'refresh_token', client_id: '1', refresh_token: 't1'})
