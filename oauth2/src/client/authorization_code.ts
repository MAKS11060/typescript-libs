/**
 * Authorization using the **Authorization Code Grant** flow
 *
 * @module authorizationCode
 */

import type { OAuth2ClientConfig, OAuth2TokenResponse } from '../oauth2.ts'
import { handleOauth2Response, normalizeScope } from './_internal.ts'

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

  fetch?: typeof fetch
}

/**
 * Generates an authorization URL for `OAuth2`.
 * @param config - `OAuth2` client configuration.
 * @param state - Optional `state` parameter.
 * @returns Authorization {@linkcode URL}.
 */
export const oauth2Authorize = (
  config: OAuth2ClientConfig,
  options?: {
    state?: string
  },
): URL => {
  if (!config.authorizeUri) throw new Error('authorizeUri is required')

  const uri = new URL(config.authorizeUri)
  uri.searchParams.set('response_type', 'code')
  uri.searchParams.set('client_id', config.clientId)

  if (config.redirectUri) uri.searchParams.set('redirect_uri', config.redirectUri)
  if (config.scope) uri.searchParams.set('scope', normalizeScope(config.scope))
  if (options?.state) uri.searchParams.set('state', options.state)

  if (config.options?.params) {
    for (const [k, v] of new URLSearchParams(config.options.params)) {
      uri.searchParams.append(k, v)
    }
  }

  return uri
}

/**
 * Exchanges an authorization `code` for tokens.
 * @param config - `OAuth2` client configuration.
 * @param options - Exchange `code` options.
 * @returns Token response.
 */
export const oauth2ExchangeCode = async <T>(
  config: OAuth2ClientConfig,
  options: OAuth2ExchangeCodeOptions,
): Promise<OAuth2TokenResponse<T>> => {
  if (!config.clientId) throw new Error('Missing required configuration: clientId')
  if (!config.tokenUri) throw new Error('Missing required configuration: tokenUri')

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

  const _fetch = options.fetch ?? fetch
  const res = await _fetch(config.tokenUri, {
    method: 'POST',
    headers,
    body,
  })

  return handleOauth2Response(res)
}

/**
 * Refreshes an access token using a refresh token.
 * @param config - `OAuth2` client configuration.
 * @param refreshToken - Refresh token.
 * @returns Token response.
 */
export const oauth2RefreshToken = async <T>(
  config: OAuth2ClientConfig,
  options: {
    refresh_token: string
    fetch?: typeof fetch
  },
): Promise<OAuth2TokenResponse<T>> => {
  if (!config.clientId) throw new Error('Missing required configuration: clientId')
  if (!config.tokenUri) throw new Error('Missing required configuration: tokenUri')

  const headers = new Headers({
    accept: 'application/json',
    'content-type': 'application/x-www-form-urlencoded',
    ...config.options?.headers,
  })

  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('client_id', config.clientId)
  body.set('refresh_token', options.refresh_token)
  if (config.clientSecret) body.set('client_secret', config.clientSecret)

  const _fetch = options.fetch ?? fetch
  const res = await _fetch(config.tokenUri, {
    method: 'POST',
    headers,
    body,
  })

  return handleOauth2Response(res)
}
