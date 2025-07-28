/**
 * Authorization using the **Implicit Grant** flow
 *
 * @module implicit
 */

import { normalizeScope } from './_internal.ts'
import type { OAuth2ClientConfig } from './types.ts'

/**
 * Generates an authorization `URL` for `OAuth2' in the browser.
 */
export const oauth2Implicit = (
  config: OAuth2ClientConfig,
  options?: {
    state?: string
  },
): URL => {
  const uri = new URL(config.authorizeUri)
  uri.searchParams.set('response_type', 'token')
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

//
/**
 * Parses an OAuth 2.0 authorization response from a URL fragment (e.g., after redirect).
 *
 * Extracts parameters from the hash (fragment) part of the URL, such as:
 * - access_token
 * - token_type
 * - expires_in
 * - scope
 * - state
 *
 * @example
 * ```ts
 * Input: http://localhost/oauth2/callback#access_token=1234&token_type=Bearer&state=abc
 * Output: { access_token: "1234", token_type: "Bearer", state: "abc" }
 *``
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.2.2
 * @param url - The full redirect URL (as string or URL object)
 * @returns Parsed response parameters, or null if no fragment exists
 */
export const parseAuthorizationResponse = (url: string | URL): Record<string, string> => {
  const urlObj = typeof url === 'string' ? new URL(url) : url

  // Fragment starts with '#' and contains the response
  const fragment = urlObj.hash.slice(1) // Remove leading '#'
  if (!fragment) return {}

  // Parse fragment as query string (it's usually application/x-www-form-urlencoded)
  const params = new URLSearchParams(fragment)
  return Object.fromEntries(params)
}
