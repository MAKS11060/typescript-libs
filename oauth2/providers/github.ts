import {type CreateOAuth2Config} from '../oauth2.ts'

/**
 * Returns the OAuth configuration for `Github`
 *
 * @see {@link https://github.com/settings/developers}
 */
export const createGithubOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  /** {@link https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes Oauth2 Scopes} */
  scope?: string | string[]
  /** Suggests a specific account to use for signing in and authorizing the app. */
  login?: string
  /**
   * Whether or not unauthenticated users will be offered an option to sign up for
   *
   * GitHub during the OAuth flow. The default is `true`. Use `false` when a policy prohibits signups.
   *
   * @default 'true'
   */
  allowSignup?: 'true' | 'false'
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config?.redirectUri?.toString(),
  authorizeUri: 'https://github.com/login/oauth/authorize',
  tokenUri: 'https://github.com/login/oauth/access_token',
  scope: config.scope,
  options: {
    params: {
      ...(config.allowSignup && {allow_signup: config.allowSignup}),
    },
  },
})
