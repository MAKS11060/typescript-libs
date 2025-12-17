import type {CreateOAuth2Config} from '../src/client/types.ts'

/**
 * Returns the OAuth configuration for `Github`
 *
 * @see {@link https://github.com/settings/developers}
 */
export const createGithubOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret?: string
  redirectUri?: string
  /**
   * {@link https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps#available-scopes Oauth2 Scopes}
   *
   * Available scopes:
   * - (no scope) - Grants read-only access to public information (including user profile info, repository info, and gists)
   * - `user`
   *   - `read:user`
   *   - `user:email`
   *   - `user:follow`
   *
   * - `repo`
   *   - `repo:status`
   *   - `repo_deployment`
   *   - `public_repo`
   *   - `repo:invite`
   *   - `security_events`
   * - `delete_repo`
   *
   * - `gist`
   * - `codespace`
   * - `workflow`
   * - `notifications`
   *
   * - `write:packages`
   * - `read:packages`
   * - `delete:packages`
   *
   * - `admin:repo_hook`
   *   - `write:repo_hook`
   *   - `read:repo_hook`
   * - `admin:org`
   *   - `write:org`
   *   - `read:org`
   * - `admin:org_hook`
   * - `admin:public_key`
   *   - `write:public_key`
   *   - `read:public_key`
   * - `admin:gpg_key`
   *   - `write:gpg_key`
   *   - `read:gpg_key`
   *
   * - `project`
   *   - `read:project`
   *
   * - `read:audit_log`
   */
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
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config?.redirectUri,
  authorizeUri: 'https://github.com/login/oauth/authorize',
  tokenUri: 'https://github.com/login/oauth/access_token',
  scope: config.scope,
  pkce: true,
  options: {
    params: {
      ...(config.login && {login: config.login}),
      ...(config.allowSignup === false && {allow_signup: 'false'}),
    },
  },
})
