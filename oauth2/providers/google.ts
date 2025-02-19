import {type CreateOAuth2Config} from '../oauth2.ts'

/**
 * Returns the OAuth configuration for `Google`
 *
 * @see {@link https://developers.google.com/identity/protocols/oauth2}
 */
export const createGoogleOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  /** @see {@link https://developers.google.com/identity/protocols/oauth2/scopes} */
  scope: string | string[]
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri?.toString(),
  authorizeUri: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  scope: config.scope,
})
