import {type CreateOAuth2Config} from '../oauth2.ts'

const origin = new URL('https://shikimori.one')

/**
 * Returns the OAuth configuration for `Shikimori`
 *
 * @see {@link https://shikimori.me/oauth/applications}
 */
export const createShikimoriOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  userAgent: string
  scope?: string | string[]
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri.toString(),
  authorizeUri: new URL('/oauth/authorize', origin).toString(),
  tokenUri: new URL('/oauth/token', origin).toString(),
  revokeUri: new URL('/oauth/revoke', origin).toString(),
  scope: config.scope,
  options: {
    headers: {'user-agent': config.userAgent},
  },
})
