import {OAuth2Error, OAuth2Exception} from './error.ts'

interface OAuth2RequestOptions {
  /** Additional URI Params */
  params?: Iterable<string[]> | Record<string, string>
  /** Additional {@linkcode HeadersInit Headers}  for {@linkcode oauth2ExchangeCode} */
  headers?: HeadersInit
}

export interface OAuth2ClientConfig {
  clientId: string
  clientSecret?: string
  /** @example https://localhost/api/oauth2/callback */
  redirectUri?: string
  authorizeUri: string
  tokenUri: string
  revokeUri?: string
  pkce?: boolean
  scope?: string | string[]
  options?: OAuth2RequestOptions
}

export interface OAuth2TokenResponse {
  access_token: string
  token_type: 'Bearer' | string
  expires_in?: number
  refresh_token?: string
  scope?: string
}

export interface OAuth2ExchangeCodeOptions {
  /** OAuth2 callback `code` */
  code: string
  /** PKCE verify code */
  codeVerifier?: string
}

/**
 * Template for creating oauth2 configuration
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
export const oauth2Authorize = (config: OAuth2ClientConfig, state?: string) => {
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

const handleOauth2Response = async (response: Response): Promise<OAuth2TokenResponse> => {
  const data: Record<string, any> = await response.json()

  // Check for errors in the response
  if (!response.ok || 'error' in data) {
    const errorData: OAuth2Error = {
      error: data.error || 'unknown_error',
      error_description: data.error_description || 'No additional information provided.',
      error_uri: data.error_uri,
    }

    // const errorMessage = `OAuth2 Error (${response.status}): ${errorData.error}`
    // const detailedMessage = errorData.error_description
    //   ? `${errorMessage} - ${errorData.error_description}`
    //   : errorMessage

    // throw new Error(detailedMessage)
    throw new OAuth2Exception(
      errorData.error,
      errorData.error_description,
      errorData.error_uri
    );
  }

  // Return the parsed token response
  return data as OAuth2TokenResponse
}

/**
 * Exchanges an authorization `code` for tokens.
 * @param config - `OAuth2` client configuration.
 * @param options - Exchange `code` options.
 * @returns Token response.
 */
export const oauth2ExchangeCode = async (
  config: OAuth2ClientConfig,
  options: OAuth2ExchangeCodeOptions
): Promise<OAuth2TokenResponse> => {
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
