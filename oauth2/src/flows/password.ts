/**
 * Authorization using the **Resource Owner Password Credentials Grant** flow
 *
 * @module password
 */

import type { OAuth2ClientConfig, OAuth2TokenResponse } from '../oauth2.ts'
import { basicAuth, handleOauth2Response, normalizeScope } from './_internal.ts'

/** */
export const oauth2Password = async <T>(
  config: OAuth2ClientConfig,
  options: {
    username: string
    password: string
    fetch?: typeof fetch
  },
): Promise<OAuth2TokenResponse<T>> => {
  if (!config.clientSecret) throw new Error('Missing required configuration: clientSecret')

  const body = new URLSearchParams()
  body.set('grant_type', 'password')
  body.set('username', options.username)
  body.set('password', options.password)
  if (config.scope) body.set('scope', normalizeScope(config.scope))

  const _fetch = options.fetch ?? fetch
  const res = await _fetch(config.tokenUri, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(config.clientId, config.clientSecret),
    },
    body,
  })

  return handleOauth2Response(res)
}
