import type { CreateOAuth2Config } from '../src/oauth2.ts'

/**
 * Returns the OAuth configuration for `Yandex`
 *
 * @see {@link https://oauth.yandex.ru Developer portal}
 * @see {@link https://yandex.ru/dev/id/doc/ru/codes/code-url#code}
 */
export const createYandexOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret?: string
  redirectUri?: string
  scope?: string | string[]

  // https://yandex.ru/dev/id/doc/ru/codes/code-url#optional
  /** Suggests a specific account to use for signing in and authorizing the app. */
  login_hint?: string
  optional_scope?: string | string[]
  force_confirm?: true
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config?.redirectUri,
  authorizeUri: 'https://oauth.yandex.ru/authorize',
  tokenUri: 'https://oauth.yandex.ru/token',
  revokeUri: 'https://oauth.yandex.ru/revoke_token',
  scope: config.scope,
  pkce: true,
  options: {
    params: {
      ...(config.login_hint && {login_hint: config.login_hint}),
      ...(config.optional_scope && {
        optional_scope: Array.isArray(config.optional_scope) //
          ? config.optional_scope.join(' ')
          : config.optional_scope,
      }),
      ...(config.force_confirm && {force_confirm: String(config.force_confirm)}),
    },
  },
})
