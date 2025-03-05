import type {OAuth2TokenResponse} from './oauth2.ts'

/**
 * Represents an `OAuth2` token object with structured properties.
 *
 * This interface defines the structure of an `OAuth2` token after it has been processed and normalized.
 *
 * @property {string} tokenType - The type of the token, typically "Bearer".
 * @property {number | null} expiresIn - The number of seconds until the access token expires, or `null` if not provided.
 * @property {string} accessToken - The access token string.
 * @property {string | null} refreshToken - The refresh token string, or `null` if not provided.
 * @property {string[]} scope - An array of scopes granted by the authorization server.
 */
export interface OAuth2Token {
  tokenType: 'Bearer'
  expiresIn: number | null
  accessToken: string
  refreshToken: string | null
  scope: string[]
}

/**
 * Converts an `OAuth2` token response into a structured `OAuth2` token object.
 *
 * This function normalizes the raw token response from an `OAuth2` provider into a consistent format,
 * ensuring that all required fields are present and properly formatted.
 *
 * @param {OAuth2TokenResponse} token - The raw `OAuth2` token response from the authorization server.
 * @returns {OAuth2Token} A structured `OAuth2` token object with normalized properties.
 *
 * @example
 * ```ts
 * const rawTokenResponse = {
 *   access_token: 'abc123',
 *   token_type: 'Bearer',
 *   expires_in: 3600,
 *   refresh_token: 'xyz789',
 *   scope: 'read write'
 * }
 *
 * const token = normalizedToken(rawTokenResponse)
 * console.log(token.accessToken) // Output: "abc123"
 * console.log(token.scope)       // Output: ["read", "write"]
 * ```
 */
export const normalizeOAuth2Token = (token: OAuth2TokenResponse): OAuth2Token => {
  return {
    tokenType: 'Bearer',
    expiresIn: token.expires_in || null,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || null,
    scope: token.scope ? token.scope.split(/[,\s]+/) : [],
  }
}

/**
 * Checks if a given token object is normalized and conforms to the {@linkcode OAuth2Token} structure.
 */
const isNormalized = (token: OAuth2TokenResponse | OAuth2Token): token is OAuth2Token => 'accessToken' in token

/**
 * Checks if an OAuth2 token has expired.
 *
 * @param {OAuth2Token} token - The OAuth2 token object to check.
 * @returns {boolean} Returns `true` if the token has expired, otherwise `false`.
 *
 * @example
 * ```ts
 * const token = {
 *   token_type: 'Bearer',
 *   expires_in: 3600,
 *   access_token: 'abc123',
 * }
 * console.log(isTokenExpired(token)) // false (if called within 1 hour)
 * ```
 */
export const isTokenExpired = (token: OAuth2TokenResponse | OAuth2Token): boolean => {
  token = isNormalized(token) ? token : normalizeOAuth2Token(token)
  if (token.expiresIn === null) return false // If no expiration time, assume it's valid
  const now = Math.floor(Date.now() / 1000)
  return now - token.expiresIn >= now
}
