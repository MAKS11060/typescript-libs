/**
 * Authorization using the **Implicit Grant** flow
 *
 * @module implicit
 */

import type { OAuth2ClientConfig } from '../oauth2.ts'
import { normalizeScope } from './_internal.ts'

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
