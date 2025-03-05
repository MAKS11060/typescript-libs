import type {CreateOAuth2Config} from '../oauth2.ts'

/**
 * Returns the OAuth configuration for `Shikimori`
 *
 * @see {@link https://shikimori.one/oauth/applications}
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
  authorizeUri: 'https://shikimori.one/oauth/authorize',
  tokenUri: 'https://shikimori.one/oauth/token',
  revokeUri: 'https://shikimori.one/oauth/revoke',
  scope: config.scope,
  options: {
    headers: {'user-agent': config.userAgent},
  },
})
