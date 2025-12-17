import type {CreateOAuth2Config} from '../src/client/types.ts'

/**
 * Returns the OAuth configuration for `Shikimori`
 *
 * @see {@link https://shikimori.one/oauth/applications}
 */
export const createShikimoriOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri?: string
  userAgent: string
  /**
   * Available scopes:
   *
   * - `user_rates` - Change your list of anime and manga
   * - `comments` - Comment on your behalf
   * - `topics` - Create topics and reviews on your behalf
   *
   * Ask Shikimori administrator if you need access to disabled scopes:
   * - `email` - Receive your email address
   * - `messages` - Read your private messages, send private messages on your behalf
   * - `content` - Change the database
   * - `clubs` - Join and leave clubs
   * - `friends` - Add and delete people as friends
   * - `ignores` - Add and remove people to ignore
   */
  scope?: string | string[]
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri,
  authorizeUri: 'https://shikimori.one/oauth/authorize',
  tokenUri: 'https://shikimori.one/oauth/token',
  revokeUri: 'https://shikimori.one/oauth/revoke',
  scope: config.scope,
  options: {
    headers: {'user-agent': config.userAgent},
  },
})
