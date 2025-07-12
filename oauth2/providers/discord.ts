import type { CreateOAuth2Config } from '../src/oauth2.ts'

/**
 * Returns the OAuth configuration for `Discord`
 *
 * @see {@link https://discord.com/developers/applications}
 */
export const createDiscordOauth2: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  /** {@link https://discord.com/developers/docs/topics/oauth2#shared-resources-oauth2-scopes Oauth2 Scopes} */
  scope: string | string[]
  /** @default 'consent' */
  prompt?: 'none' | 'consent'
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri.toString(),
  authorizeUri: 'https://discord.com/oauth2/authorize',
  tokenUri: 'https://discord.com/api/oauth2/token',
  scope: config.scope,
  options: {
    params: {
      ...(config.prompt && {prompt: config.prompt}),
    },
  },
})
