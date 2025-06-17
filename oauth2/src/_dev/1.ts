export interface OAuth2ClientConfig {
  /** `OAuth2`client config */
  client: {
    id: string
    secret?: string
    redirectUri?: string
    scope?: string | string[]
  }

  /** `OAuth2` server endpoints */
  endpoint: {
    authorize: string
    token: string
    revoke?: string
  }

  /** `OAuth2` server options */
  server?: {
    pkce?: boolean
  }
}

interface BaseConfig {
}

type CreateOAuth2ClientConfig<
  T extends Record<string, unknown>,
> = (config: T) => OAuth2ClientConfig

// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
const createGithubOauth2: CreateOAuth2ClientConfig<{
  clientId: string
  clientSecret?: string
  redirectUri?: string

  /** {@link https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes Oauth2 Scopes} */
  scope?: string | string[]

  /** Suggests a specific account to use for signing in and authorizing the app. */
  login?: string

  /**
   * Whether or not unauthenticated users will be offered an option to sign up for
   *
   * GitHub during the OAuth flow. The default is `true`. Use `false` when a policy prohibits signups.
   *
   * @default true
   */
  allowSignup?: boolean

  /**
   * Forces the account picker to appear if set to `select_account`.
   *
   * The account picker will also appear if the application has a non-HTTP redirect
   * URI or if the user has multiple accounts signed in.
   */
  prompt?: string
}> = (config) => ({
  client: {
    id: config.clientId,
    secret: config.clientSecret,
    redirectUri: config.redirectUri,
    scope: config.scope,
  },
  options: {
    params: {
      ...(config.login && {login: config.login}),
      ...(config.allowSignup === false && {allow_signup: 'false'}),
    },
  },
  endpoint: {
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
  },
})

export const createDiscordOauth2: CreateOAuth2ClientConfig<{
  clientId: string
  clientSecret: string
  redirectUri: string
  /** {@link https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes Oauth2 Scopes} */
  scope: string | string[]
  /** @default 'consent' */
  prompt?: 'none' | 'consent'
}> = (config) => ({
  client: {
    id: config.clientId,
    secret: config.clientSecret,
    redirectUri: config.redirectUri,
  },
  endpoint: {
    authorize: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    revoke: 'https://discord.com/api/oauth2/token/revoke',
  },
  pkce: true,
})
