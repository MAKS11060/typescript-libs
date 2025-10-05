/**
 * Represents the response structure for an `OAuth2` token.
 *
 * This type extends a generic type `T` to allow for additional fields returned by the authorization server,
 * while ensuring the presence of standard `OAuth2` token fields.
 *
 * @template T - An optional type to extend the response with additional fields specific to the authorization server.
 */
export type OAuth2Token<T extends object = Record<string, string>> = T & {
  /**
   * The access token issued by the authorization server.
   * This token is used to access protected resources on behalf of the user.
   */
  access_token: string

  /**
   * The type of the token, typically "Bearer".
   * This indicates how the token should be used in requests (e.g., as a Bearer token).
   */
  token_type: string

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
