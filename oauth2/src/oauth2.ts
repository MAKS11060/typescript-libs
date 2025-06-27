interface OAuth2RequestOptions {
  /** Additional URI Params */
  params?: Iterable<string[]> | Record<string, string>
  /** Additional {@linkcode HeadersInit Headers} for {@linkcode oauth2ExchangeCode} */
  headers?: HeadersInit
}

/**
 * Represents the configuration required for an `OAuth2` client.
 */
export interface OAuth2ClientConfig {
  /**
   * The unique identifier for the application (client ID) provided by the authorization server.
   */
  clientId: string

  /**
   * The secret key associated with the client ID, used for authentication with the authorization server.
   * This is optional for public clients but required for confidential clients.
   */
  clientSecret?: string

  /**
   * The URL in your application where users will be redirected after authorization.
   * If not provided, the authorization server may use a default or pre-registered redirect URI.
   *
   * @example https://localhost/api/oauth2/callback
   */
  redirectUri?: string

  /**
   * The URL of the authorization endpoint provided by the authorization server.
   * This is where the user is redirected to initiate the authorization process.
   */
  authorizeUri: string

  /**
   * The URL of the token endpoint provided by the authorization server.
   * This is where the client exchanges the authorization code for tokens.
   */
  tokenUri: string

  /**
   * The URL of the token revocation endpoint provided by the authorization server.
   * This is used to revoke access or refresh tokens.
   */
  revokeUri?: string

  /**
   * A space-separated string or array of scopes that define the level of access requested from the user.
   * Scopes are used to specify which resources the application is requesting access to.
   */
  scope?: string | string[]

  /**
   * Indicates whether Proof Key for Code Exchange (PKCE) should be used for additional security.
   * PKCE helps protect against authorization code interception attacks.
   */
  pkce?: boolean

  /**
   * Additional options for customizing the `OAuth2` request, such as headers or query parameters.
   */
  options?: OAuth2RequestOptions
}

/**
 * Represents the response structure for an `OAuth2` token.
 *
 * This type extends a generic type `T` to allow for additional fields returned by the authorization server,
 * while ensuring the presence of standard `OAuth2` token fields.
 *
 * @template T - An optional type to extend the response with additional fields specific to the authorization server.
 */
export type OAuth2TokenResponse<T = unknown> = T & {
  /**
   * The access token issued by the authorization server.
   * This token is used to access protected resources on behalf of the user.
   */
  access_token: string

  /**
   * The type of the token, typically "Bearer".
   * This indicates how the token should be used in requests (e.g., as a Bearer token).
   */
  token_type: 'Bearer' | string

  /**
   * The number of seconds until the access token expires.
   * If not provided, the token is assumed to never expire.
   */
  expires_in?: number

  /**
   * The refresh token issued by the authorization server.
   * This token can be used to obtain new access tokens without requiring the user to re-authenticate.
   */
  refresh_token?: string

  /**
   * A space-separated string of scopes granted by the authorization server.
   * These scopes indicate which resources the application has been authorized to access.
   */
  scope?: string
}

/**
 * Represents the options required to exchange an authorization code for tokens.
 */
export interface OAuth2ExchangeCodeOptions {
  /**
   * The authorization code received from the authorization server during the redirect.
   * This code is exchanged for an access token and optionally a refresh token.
   */
  code: string

  /**
   * The PKCE (Proof Key for Code Exchange) verify code used to validate the authorization code.
   * This is required if PKCE was used during the authorization request.
   */
  codeVerifier?: string
}

/**
 * Template for creating `OAuth2` configuration
 *
 * @example
 * ```ts
 * const createExampleConfig: CreateOAuth2Config<{
 *   clientId: string
 *   clientSecret: string
 *   redirectUri: string | URL
 *   scope: string | string[]
 * }> = (config) => ({
 *   clientId: config.clientId,
 *   clientSecret: config.clientSecret,
 *   redirectUri: config.redirectUri.toString(),
 *   authorizeUri: 'https://example.com/oauth2/authorize',
 *   tokenUri: 'https://example.com/api/oauth2/token',
 *   scope: config.scope,
 * })
 * ```
 */
export type CreateOAuth2Config<T extends Record<string, unknown> = {redirectUri: string | URL}> = (
  config: T
) => OAuth2ClientConfig
