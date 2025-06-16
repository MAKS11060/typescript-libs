/**
 * Authorization using the **Client Credentials Grant** flow
 *
 * @example Usage example with [Discord Client Credentials Grant](https://discord.com/developers/docs/topics/oauth2#client-credentials-grant)
 * ```ts
 * import {createDiscordOauth2, oauth2ClientCredentials} from '@maks11060/oauth2'
 *
 * const discordOauth2 = createDiscordOauth2({
 *   clientId: Deno.env.get('DISCORD_CLIENT_ID')!,
 *   clientSecret: Deno.env.get('DISCORD_CLIENT_SECRET')!,
 *   redirectUri: Deno.env.get('OAUTH2_REDIRECT')!,
 *   scope: ['identify', 'applications.commands.update'],
 * })
 * const token = await oauth2ClientCredentials(discordOauth2)
 * ```
 *
 * @module clientCredentials
 */

import type { OAuth2ClientConfig, OAuth2TokenResponse } from '../oauth2.ts'
import { basicAuth, handleOauth2Response, normalizeScope } from './_internal.ts'

/**
 * Client Credentials Grant
 * @param config {@linkcode OAuth2ClientConfig}
 * @param credentialLocation
 * @returns Token response.
 * @example
 * ```ts
 * // https://discord.com/developers/docs/topics/oauth2#client-credentials-grant
 * import {createDiscordOauth2, oauth2ClientCredentials} from '@maks11060/oauth2'
 *
 * const discordOauth2 = createDiscordOauth2({
 *   clientId: Deno.env.get('CLIENT_ID')!,
 *   clientSecret: Deno.env.get('CLIENT_SECRET')!,
 *   redirectUri: Deno.env.get('OAUTH2_REDIRECT')!,
 *   scope: ['identify', 'applications.commands.update'],
 * })
 * const token = await oauth2ClientCredentials(discordOauth2)
 * ```
 */
export const oauth2ClientCredentials = async <T>(
  config: OAuth2ClientConfig,
  credentialLocation: 'header' | 'query' = 'header',
): Promise<OAuth2TokenResponse<T>> => {
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
        Authorization: basicAuth(config.clientId, config.clientSecret),
      }),
    },
    body,
  })

  return handleOauth2Response(res)
}
