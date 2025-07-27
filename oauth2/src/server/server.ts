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

/**
 * The basic interface of the `OAuth2` client.
 * Represents a registered OAuth2 application.
 *
 * Can be extended to include additional metadata (e.g. scopes, logo, contacts).
 */
export interface OAuth2Client {
  /**
   * Client type:
   * - `confidential`: server-side apps that can securely store secrets (e.g. web backends).
   *   - Must use `client_secret`.
   * - `public`: client-side apps (e.g. SPA, mobile) that cannot store secrets.
   *   - Must **not** use `client_secret`.
   *   - **Must** use PKCE for security.
   *
   * @default 'confidential'
   */
  type?: 'confidential' | 'public'

  /**
   * Human-readable name of the OAuth2 application.
   * Used in consent screens and admin panels.
   *
   * @example "My Awesome App"
   */
  appName: string

  /**
   * Unique identifier for the OAuth2 client.
   * Issued by the authorization server during registration.
   *
   * @example "client_123abc"
   */
  clientId: string

  /**
   * Secret used to authenticate confidential clients.
   *
   * ⚠️ **Security note**: Never store this in plain text.
   * Always hash it (e.g. with bcrypt) before saving to the database.
   * The original secret should only be shown once (on creation) to the developer.
   *
   * For public clients, this field may be omitted or ignored.
   *
   * @example "sec_456xyz"
   */
  clientSecret: string

  /**
   * List of allowed redirection URIs.
   *
   * After authorization, the user agent will be redirected to one of these URIs.
   *
   * Rules:
   * - Must **exactly match** (including trailing slash, case, query params if any).
   * - If multiple URIs are provided, the client **must** specify `redirect_uri` in the request.
   * - If only one URI is provided, it will be used as default when `redirect_uri` is omitted.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.4
   *
   * @example
   * ```ts
   * redirectUri: [
   *   'https://app.com/oauth/callback',
   *   'https://localhost:8080/callback'
   * ]
   * ```
   */
  redirectUri: string[]
}

/**
 * Default context type stored with the authorization code.
 * Typically contains the authenticated user's identifier (`sub`).
 *
 * Can be extended to include additional session data (e.g. scopes, session ID).
 *
 * @example { sub: "user_789", scopes: ["read", "write"] }
 */
export interface DefaultCtx {
  /**
   * Subject identifier — the authenticated user.
   */
  sub: string
}

// ===== STORAGE =====

/**
 * Data structure stored during the authorization process (e.g., for `authorization_code` grant).
 *
 * This is persisted temporarily and linked to the generated `code`.
 *
 * @template Ctx - Type of context data (default: {@link DefaultCtx})
 */
export interface OAuth2StorageData<Ctx = DefaultCtx> {
  /**
   * Context data associated with the authorization request.
   * Usually contains user identity and scopes.
   */
  ctx: Ctx

  /**
   * Authorization code issued to the client.
   * One-time use, short-lived.
   */
  code: string

  /**
   * Client ID that requested the code.
   */
  clientId: string

  /**
   * Redirect URI to which the client will be redirected after authorization.
   * Must match the one used in the initial request.
   */
  redirectUri: string

  /**
   * PKCE: Code challenge (derived from `code_verifier`).
   * Present only if PKCE was used.
   *
   * @see https://datatracker.ietf.org/doc/html/rfc7636
   */
  codeChallenge?: string | null

  /**
   * PKCE: Method used to derive the code challenge.
   * - `S256` (recommended): SHA-256
   * - `plain` (discouraged): plain `code_verifier`
   */
  codeChallengeMethod?: 'S256' | 'plain' | null

  /**
   * Timestamp when the code was created.
   * Used to enforce expiration (e.g., 10 minutes).
   */
  createdAt: Date
}

/**
 * Storage contract for the OAuth2 server.
 * Defines how authorization codes are stored and retrieved.
 *
 * @template Ctx - Type of context data
 */
export interface OAuth2Storage<Ctx = DefaultCtx> {
  /**
   * Retrieve storage data by authorization code.
   *
   * @param code - The authorization code
   * @returns The stored data or `null`/`undefined` if not found or expired
   */
  get(
    code: string,
  ): Promise<OAuth2StorageData<Ctx> | null | undefined | void> | OAuth2StorageData<Ctx> | null | undefined | void

  /**
   * Persist authorization code and associated data.
   *
   * @param data - Data to store (code, client, redirect URI, PKCE, etc.)
   */
  set(data: OAuth2StorageData<Ctx>): Promise<void> | void | unknown
}

// ===== SERVER OPTIONS =====

/**
 * Configuration options for the OAuth2 server.
 *
 * @template Ctx - Type of context data (e.g., user ID, scopes)
 * @template Client - Type of client (extends {@link OAuth2Client})
 */
export interface OAuth2ServerOptions<Ctx = DefaultCtx, Client extends OAuth2Client = OAuth2Client> {
  /**
   * Optional server settings.
   */
  options?: {
    /**
     * Time (in milliseconds) after which the authorization code expires.
     *
     * @default 600_000 (10 minutes)
     */
    codeTimeout?: number
  }

  /**
   * Retrieve a client by its ID.
   *
   * @param clientId - The client identifier
   * @returns The client config or `null`/`undefined` if not found
   */
  getClient(clientId: string): Promise<Client | null | undefined> | Client | null | undefined | void

  /**
   * Generate a cryptographically secure authorization code.
   *
   * @param client - The client requesting the code
   * @returns A unique code (e.g., base64url-encoded random bytes)
   *
   * @example
   * ```ts
   * generateCode: () => encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
   * ```
   *
   * @default Generates a 32-byte random value encoded in base64url
   */
  generateCode?(client: Client): string

  /**
   * Storage backend for authorization codes.
   * Must implement {@link OAuth2Storage}.
   */
  storage: OAuth2Storage<Ctx>

  /**
   * Handlers for OAuth2 grant types.
   *
   * Each returns a token response (access token, refresh token, etc.).
   */
  grants: {
    /**
     * Handle `authorization_code` grant.
     *
     * @param client - Authenticated client
     * @param store - Data associated with the authorization code
     * @returns Token response (e.g., access token, refresh token)
     */
    authorizationCode?(
      {client, store}: {client: Client; store: OAuth2StorageData<Ctx>},
    ): Promise<OAuth2TokenResponse>

    /**
     * Handle `implicit` grant (token returned in redirect URI fragment).
     *
     * @param client - Authenticated client
     * @returns Token response
     */
    implicit?({client}: {client: Client}): Promise<OAuth2TokenResponse> | OAuth2TokenResponse

    /**
     * Handle `password` grant (Resource Owner Password Credentials).
     *
     * ⚠️ Use with caution — only for trusted clients.
     *
     * @param client_id - Client ID
     * @param client_secret - Client secret (if confidential)
     * @param username - User identifier
     * @param password - User password
     * @returns Token response
     */
    password?(params: {
      client_id: string
      client_secret: string
      username: string
      password: string
    }): Promise<OAuth2TokenResponse> | OAuth2TokenResponse

    /**
     * Handle `client_credentials` grant.
     *
     * Used for machine-to-machine authentication.
     *
     * @param client_id - Client ID
     * @param client_secret - Client secret
     * @returns Token response
     */
    credentials?(params: {client_id: string; client_secret: string}): Promise<OAuth2TokenResponse> | OAuth2TokenResponse

    /**
     * Handle `refresh_token` grant.
     *
     * @param client_id - Client ID
     * @param refresh_token - Refresh token
     * @returns New token response
     */
    refreshToken?(
      {client_id, refresh_token}: {client_id: string; refresh_token: string},
    ): Promise<OAuth2TokenResponse> | OAuth2TokenResponse
  }
}

// ===== SERVER API =====

/**
 * OAuth2 server instance.
 *
 * @template Ctx - Context data type
 * @template Client - Client type
 * @template Options - Options type
 */
interface OAuth2Server<
  Ctx /* extends object */ = DefaultCtx,
  Client extends OAuth2Client = OAuth2Client,
  Options = OAuth2ServerOptions<Ctx, Client>,
> {
  /**
   * Initiate the authorization flow.
   *
   * @param options.uri - Authorization request URL (e.g., from client)
   * @param options.ctx - Optional context data to store with the code (e.g., user ID)
   * @returns Redirect info with `responseType` and `authorizeUri`
   *
   * @example
   * ```ts
   * const { authorizeUri } = await server.authorize({
   *   uri: 'https://auth.example.com/authorize?response_type=code&client_id=abc&redirect_uri=https://app.com/cb'
   * });
   * // redirect to authorizeUri
   * ```
   */
  authorize(options: {uri: URL | string} & (Ctx extends object ? {ctx: Ctx} : {ctx?: Ctx})): Promise<{
    responseType: 'code' | 'token'
    authorizeUri: URL
    client: Client
  }>

  /**
   * Exchange credentials for tokens using supported grant types.
   */
  token(data: OAuth2GrantTypeAuthorizationCode): Promise<{
    grantType: 'authorization_code'
    token: OAuth2TokenResponse<GetGrant<Options, 'authorizationCode'>>
  }>
  token(data: OAuth2GrantTypeRefresh): Promise<{
    grantType: 'refresh_token'
    token: OAuth2TokenResponse<GetGrant<Options, 'refreshToken'>>
  }>
  token(data: OAuth2GrantTypeCredentials): Promise<{
    grantType: 'client_credentials'
    token: OAuth2TokenResponse<GetGrant<Options, 'credentials'>>
  }>
  token(data: OAuth2GrantTypePassword): Promise<{
    grantType: 'password'
    token: OAuth2TokenResponse<GetGrant<Options, 'password'>>
  }>
}

// ===== GRANT TYPES =====

/**
 * Authorization Code Grant request.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1
 */
export type OAuth2GrantTypeAuthorizationCode = {
  grant_type: 'authorization_code'
  code: string
  client_id: string
  client_secret?: string
  redirect_uri?: string
  code_verifier?: string
  state?: string
}

/**
 * Refresh Token Grant request.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-6
 */
export type OAuth2GrantTypeRefresh = {
  grant_type: 'refresh_token'
  client_id: string
  refresh_token: string
}

/**
 * Client Credentials Grant request.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.4
 */
export type OAuth2GrantTypeCredentials = {
  grant_type: 'client_credentials'
  client_id: string
  client_secret: string
}

/**
 * Resource Owner Password Credentials Grant request.
 *
 * ⚠️ Not recommended unless absolutely necessary.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.3
 */
export type OAuth2GrantTypePassword = {
  grant_type: 'password'
  client_id: string
  client_secret: string
  username: string
  password: string
}

/**
 * Union of all supported OAuth2 grant types.
 */
export type OAuth2GrantType =
  | OAuth2GrantTypeAuthorizationCode
  | OAuth2GrantTypeRefresh
  | OAuth2GrantTypeCredentials
  | OAuth2GrantTypePassword

type GetGrant<T, G extends string> = T extends {grants: { [K in G]: (...args: any[]) => infer O }}
  ? O extends Promise<infer P> ? P : O
  : never

type CreateOauth2Server = <
  Ctx /* extends object */ = DefaultCtx,
  Client extends OAuth2Client = OAuth2Client,
  Options = OAuth2ServerOptions<Ctx, Client>,
>(
  options: OAuth2ServerOptions<Ctx, Client> & Options, // Very Sensitive code
) => OAuth2Server<Ctx, Client, Options>

/**
 * Factory function to create an OAuth2 server instance.
 *
 * @template Ctx - Context data (e.g., user info)
 * @template Client - Custom client type
 *
 * @param options - Server configuration
 * @returns OAuth2 server instance
 *
 * @example
 * ```ts
 * const store = new Map<string, OAuth2StorageData>()
 * const clients: OAuth2Client[] = [{
 *   appName: 'My App',
 *   clientId: 'client_1',
 *   clientSecret: 'SECRET',
 *   redirectUri: ['http://localhost/oauth2/callback'],
 * }]
 *
 * const oauth2Server = createOauth2Server({
 *   getClient(clientId) {
 *     return clients.find((client) => client.clientId === clientId)
 *   },
 *   storage: {
 *     set: (data) => store.set(data.code, data),
 *     get: (code) => store.get(code),
 *   },
 *   grants: {
 *     async authorizationCode({client, store}) {
 *       return {
 *         access_token: crypto.randomUUID(),
 *         token_type: 'Bearer',
 *       }
 *     },
 *   },
 * })
 * ```
 */
export const createOauth2Server: CreateOauth2Server = (options) => {
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
