import type {CreateOAuth2Config} from '../src/oauth2.ts'

/**
 * Returns the OAuth configuration for `Google`
 *
 * @see {@link https://developers.google.com/identity/protocols/oauth2}
 * @see {@link https://developers.google.com/identity/protocols/oauth2/web-server#creatingclient
 */
export const createGoogleOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  /** @see {@link https://developers.google.com/identity/protocols/oauth2/scopes} */
  scope: string | string[]
  /**
   * - `online` - for SPA
   * - `offline` - include refresh token
   * @default 'online'
   */
  access_type?: 'online' | 'offline'
  /**
   * Enables applications to use incremental authorization to request access to additional scopes in context.
   * If you set this parameter's value to `true` and the authorization request is granted, then the new access
   * token will also cover any scopes to which the user previously granted the application access
   */
  include_granted_scopes?: boolean
  /**
   * @default true
   */
  enable_granular_consent?: boolean
  /**
   * If your application knows which user is trying to authenticate, it can use
   * this parameter to provide a hint to the Google Authentication Server.
   * The server uses the hint to simplify the login flow either by prefilling
   * the email field in the sign-in form or by selecting the appropriate multi-login session.
   *
   * Set the parameter value to an email address or sub identifier, which is equivalent to the user's Google ID.
   *
   * Examples:
   * - `example@gmail.com`
   * - `1234567890`
   */
  login_hint?: string
  /**
   * A space-delimited, case-sensitive list of prompts to present the user.
   * If you don't specify this parameter, the user will be prompted only the
   * first time your project requests access.
   *
   * - `none` - Do not display any authentication or consent screens. Must not be specified with other values.
   * - `consent` -	Prompt the user for consent.
   * - `select_account` -	Prompt the user to select an account.
   */
  prompt?: 'none' | 'consent' | 'select_account'
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri?.toString(),
  authorizeUri: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUri: 'https://oauth2.googleapis.com/token',
  scope: config.scope,
  options: {
    params: {
      ...(config.access_type && {access_type: config.access_type}),
      ...(config.include_granted_scopes && {include_granted_scopes: 'true'}),
      ...(config.enable_granular_consent === false && {enable_granular_consent: 'false'}),
      ...(config.login_hint && {login_hint: config.login_hint}),
      ...(config.prompt && {prompt: config.prompt}),
    },
  },
})
