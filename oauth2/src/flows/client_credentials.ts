/**
 * Authorization using the Client Credentials Grant flow
 *
 * @module clientCredentials
 */

import {encodeBase64} from '@std/encoding/base64'
import {handleOauth2Response, normalizeScope} from '../_internal.ts'
import type {OAuth2ClientConfig, OAuth2TokenResponse} from '../oauth2.ts'


/**
 * Client Credentials Grant
 */
export const oauth2ClientCredentials = async (
  config: OAuth2ClientConfig,
  credentialLocation: 'header' | 'query' = 'header'
): Promise<OAuth2TokenResponse> => {
  if (!config.clientSecret) throw new Error('Missing required configuration: clientSecret')

  const body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  if (credentialLocation === 'query') {
    body.set('client_id', config.clientId)
    body.set('client_secret', config.clientSecret)
  }
  if (config.scope) body.set('scope', normalizeScope(config.scope))

  const res = await fetch(config.tokenUri, {
    method: 'POST',
    headers: {
      ...(credentialLocation === 'header' && {
        Authorization: `Basic ${encodeBase64(`${config.clientId}:${config.clientSecret}`)}`,
      }),
    },
    body,
  })

  return handleOauth2Response(res)
}
