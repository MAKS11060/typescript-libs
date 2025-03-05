import {type OAuth2Error, OAuth2Exception} from './error.ts'

interface OAuth2RequestOptions {
  /** Additional URI Params */
  params?: Iterable<string[]> | Record<string, string>
  /** Additional {@linkcode HeadersInit Headers} for {@linkcode oauth2ExchangeCode} */
  headers?: HeadersInit
}

/**
 * Represents the configuration required for an `OAuth2` client.
 */
export interface OAuth2ClientConfig {
  /**
   * The unique identifier for the application (client ID) provided by the authorization server.
   */
  clientId: string

  /**
   * The secret key associated with the client ID, used for authentication with the authorization server.
   * This is optional for public clients but required for confidential clients.
   */
  clientSecret?: string

  /**
   * The URL in your application where users will be redirected after authorization.
   * If not provided, the authorization server may use a default or pre-registered redirect URI.
   *
   * @example https://localhost/api/oauth2/callback
   */
  redirectUri?: string

  /**
   * The URL of the authorization endpoint provided by the authorization server.
   * This is where the user is redirected to initiate the authorization process.
   */
  authorizeUri: string

  /**
   * The URL of the token endpoint provided by the authorization server.
   * This is where the client exchanges the authorization code for tokens.
   */
  tokenUri: string

  /**
   * The URL of the token revocation endpoint provided by the authorization server.
   * This is used to revoke access or refresh tokens.
   */
  revokeUri?: string

  /**
   * A space-separated string or array of scopes that define the level of access requested from the user.
   * Scopes are used to specify which resources the application is requesting access to.
   */
  scope?: string | string[]

  /**
   * Indicates whether Proof Key for Code Exchange (PKCE) should be used for additional security.
   * PKCE helps protect against authorization code interception attacks.
   */
  pkce?: boolean

  /**
   * Additional options for customizing the `OAuth2` request, such as headers or query parameters.
   */
  options?: OAuth2RequestOptions
}

/**
 * Represents the response structure for an `OAuth2` token.
 *
 * This type extends a generic type `T` to allow for additional fields returned by the authorization server,
 * while ensuring the presence of standard `OAuth2` token fields.
 *
 * @template T - An optional type to extend the response with additional fields specific to the authorization server.
 */
export type OAuth2TokenResponse<T = unknown> = T & {
  /**
   * The access token issued by the authorization server.
   * This token is used to access protected resources on behalf of the user.
   */
  access_token: string

  /**
   * The type of the token, typically "Bearer".
   * This indicates how the token should be used in requests (e.g., as a Bearer token).
   */
  token_type: 'Bearer' | string

  /**
   * The number of seconds until the access token expires.
   * If not provided, the token is assumed to never expire.
   */
  expires_in?: number

  /**
   * The refresh token issued by the authorization server.
   * This token can be used to obtain new access tokens without requiring the user to re-authenticate.
   */
  refresh_token?: string

  /**
   * A space-separated string of scopes granted by the authorization server.
   * These scopes indicate which resources the application has been authorized to access.
   */
  scope?: string
}

/**
 * Represents the options required to exchange an authorization code for tokens.
 */
export interface OAuth2ExchangeCodeOptions {
  /**
   * The authorization code received from the authorization server during the redirect.
   * This code is exchanged for an access token and optionally a refresh token.
   */
  code: string

  /**
   * The PKCE (Proof Key for Code Exchange) verify code used to validate the authorization code.
   * This is required if PKCE was used during the authorization request.
   */
  codeVerifier?: string
}

/**
 * Template for creating `OAuth2` configuration
 *
 * @example
 * ```ts
 * const createExampleConfig: CreateOAuth2Config<{
 *   clientId: string
 *   clientSecret: string
 *   redirectUri: string | URL
 *   scope: string | string[]
 * }> = (config) => ({
 *   clientId: config.clientId,
 *   clientSecret: config.clientSecret,
 *   redirectUri: config.redirectUri.toString(),
 *   authorizeUri: 'https://example.com/oauth2/authorize',
 *   tokenUri: 'https://example.com/api/oauth2/token',
 *   scope: config.scope,
 * })
 * ```
 */
export type CreateOAuth2Config<T extends Record<string, unknown> = {redirectUri: string | URL}> = (
  config: T
) => OAuth2ClientConfig

/**
 * Generates an authorization URL for `OAuth2`.
 * @param config - `OAuth2` client configuration.
 * @param state - Optional `state` parameter.
 * @returns Authorization {@linkcode URL}.
 */
export const oauth2Authorize = (config: OAuth2ClientConfig, state?: string): URL => {
  if (!config.authorizeUri) throw new Error('authorizeUri is required')

  const uri = new URL(config.authorizeUri)
  uri.searchParams.set('response_type', 'code')
  uri.searchParams.set('client_id', config.clientId)

  if (config?.redirectUri) uri.searchParams.set('redirect_uri', config.redirectUri)

  const scope = config?.scope
  if (scope) uri.searchParams.set('scope', Array.isArray(scope) ? scope.join(' ') : scope)
  if (state) uri.searchParams.set('state', state)

  if (config.options?.params) {
    for (const [k, v] of new URLSearchParams(config.options.params)) {
      uri.searchParams.append(k, v)
    }
  }

  return uri
}

const handleOauth2Response = async <T>(response: Response): Promise<OAuth2TokenResponse<T>> => {
  const data: Record<string, any> = await response.json()

  // Check for errors in the response
  if (!response.ok || 'error' in data) {
    const errorData: OAuth2Error = {
      error: data.error || 'unknown_error',
      error_description: data.error_description || 'No additional information provided.',
      error_uri: data.error_uri,
    }

    throw new OAuth2Exception(errorData.error, errorData.error_description, errorData.error_uri)
  }

  // Return the parsed token response
  return data as OAuth2TokenResponse<T>
}

/**
 * Exchanges an authorization `code` for tokens.
 * @param config - `OAuth2` client configuration.
 * @param options - Exchange `code` options.
 * @returns Token response.
 */
export const oauth2ExchangeCode = async <T>(
  config: OAuth2ClientConfig,
  options: OAuth2ExchangeCodeOptions
): Promise<OAuth2TokenResponse<T>> => {
  if (!config.clientId || !config.tokenUri) throw new Error('Missing required configuration: clientId or tokenUri')

  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    ...config.options?.headers,
  })

  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('client_id', config.clientId)
  body.set('code', options.code)

  if (config.clientSecret) body.set('client_secret', config.clientSecret)
  if (config.redirectUri) body.set('redirect_uri', config.redirectUri)
  if (options.codeVerifier) body.set('code_verifier', options.codeVerifier)

  const res = await fetch(config.tokenUri, {method: 'POST', headers, body})
  return handleOauth2Response(res)
}

/**
 * Refreshes an access token using a refresh token.
 * @param config - `OAuth2` client configuration.
 * @param refreshToken - Refresh token.
 * @returns Token response.
 */
export const oauth2RefreshToken = async (
  config: OAuth2ClientConfig,
  refreshToken: string
): Promise<OAuth2TokenResponse> => {
  if (!config.clientId || !config.tokenUri) throw new Error('Missing required configuration: clientId or tokenUri')

  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    ...config.options?.headers,
  })

  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('client_id', config.clientId)
  body.set('refresh_token', refreshToken)

  if (config.clientSecret) body.set('client_secret', config.clientSecret)

  const res = await fetch(config.tokenUri, {method: 'POST', headers, body})
  return handleOauth2Response(res)
}
