import { ErrorMap, OAuth2Exception } from '../../error.ts'
import { parseBasicAuth } from '../helper.ts'
import type { OAuth2GrantType } from '../server.ts'

/**
 * Parses an OAuth 2.0 authorization request URL (e.g., from /authorize endpoint).
 *
 * Extracts and validates standard and extension parameters from the query string.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1
 * @see https://datatracker.ietf.org/doc/html/rfc7636 (PKCE)
 *
 * @param url - The full authorization request URL (string or URL object)
 * @returns Parsed authorization request parameters
 * @throws {OAuth2Exception} If URL is invalid or malformed
 */
export const parseAuthorizationUrl = (url: string | URL) => {
  let urlObj: URL
  try {
    urlObj = typeof url === 'string' ? new URL(url) : url
  } catch (e) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Invalid authorization URL')
  }

  const params = new URLSearchParams(urlObj.search)

  const clientId = params.get('client_id')
  if (!clientId) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing client_id')
  }

  const redirectUri = params.get('redirect_uri')
  // Note: redirect_uri is optional if only one is registered, but we leave validation to the server

  const responseType = params.get('response_type')
  if (!responseType) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing response_type')
  }

  const scope = params.get('scope')
  const state = params.get('state')

  // Response mode (optional): query, fragment, form_post, etc.
  const responseMode = params.get('response_mode')

  // PKCE parameters
  const codeChallenge = params.get('code_challenge') || undefined
  const codeChallengeMethod = (params.get('code_challenge_method') || undefined) as
    | 'S256'
    | 'plain'
    | undefined

  // Validate code_challenge_method if code_challenge is present
  if (codeChallenge && codeChallengeMethod && !['S256', 'plain'].includes(codeChallengeMethod)) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Invalid code_challenge_method')
  }

  return {
    /**
     * The client identifier.
     * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.1
     */
    client_id: clientId,

    /**
     * Redirection URI to which the response will be sent.
     * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2
     */
    redirect_uri: redirectUri || undefined,

    /**
     * Determines the type of authorization grant.
     * Must be one of: 'code', 'token', or others if supported.
     * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.1
     */
    response_type: responseType,

    /**
     * Scope of the access request.
     * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.3
     */
    scope: scope || undefined,

    /**
     * Opaque value used to maintain state between request and callback.
     * @see https://datatracker.ietf.org/doc/html/rfc6749#section-4.1.1
     */
    state: state || undefined,

    /**
     * Determines where the response parameters are embedded.
     * @default Based on response_type ('query' for code, 'fragment' for token)
     * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2.1
     */
    response_mode: responseMode || undefined,

    /**
     * Proof Key for Code Exchange (PKCE) challenge.
     * @see https://datatracker.ietf.org/doc/html/rfc7636#section-3.1
     */
    code_challenge: codeChallenge,

    /**
     * Method used to derive the code challenge.
     * @default 'plain' if code_challenge is present but method is omitted
     */
    code_challenge_method: codeChallengeMethod || (codeChallenge ? 'plain' : undefined),
  } as const
}

/**
 * Parses an incoming HTTP request to extract OAuth 2.0 token endpoint parameters.
 *
 * Supports:
 * - application/x-www-form-urlencoded payload
 * - client credentials via Authorization: Basic header (RFC 6749 Section 2.3.1)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc6749#section-3.2
 * @param request - The incoming HTTP request (Fetch API compatible)
 * @returns Parsed token grant data
 * @throws {OAuth2Exception} On invalid request, missing parameters, or mismatches
 */
export const parseTokenRequest = async (request: Request): Promise<OAuth2GrantType> => {
  // Ensure the HTTP method is POST
  if (request.method !== 'POST') {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'HTTP method must be POST')
  }

  // Check for correct Content-Type
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    throw new OAuth2Exception(
      ErrorMap.invalid_request,
      'Content-Type must be application/x-www-form-urlencoded',
    )
  }

  // Read and parse the request body
  const bodyText = await request.text()
  const params = new URLSearchParams(bodyText)

  const grantType = params.get('grant_type')
  if (!grantType) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing grant_type')
  }

  // Extract client_id and client_secret from body
  let client_id = params.get('client_id')
  let client_secret = params.get('client_secret') || undefined

  // Handle Authorization: Basic header (takes precedence over body)
  const authHeader = request.headers.get('Authorization')
  const auth = parseBasicAuth(authHeader)
  if (auth) {
    console.log({auth})
    // If client_id is provided in body, it must match the one in the header
    if (client_id && client_id !== auth.username) {
      throw new OAuth2Exception(
        ErrorMap.invalid_request,
        'client_id in body does not match client_id in Authorization header',
      )
    }

    // Use credentials from the header (more secure)
    client_id = auth.username
    client_secret = auth.password
  }

  // client_id is required regardless of source
  if (!client_id) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing client_id')
  }

  // Parse grant-specific parameters
  switch (grantType) {
    case 'authorization_code': {
      const code = params.get('code')
      if (!code) {
        throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing authorization code')
      }

      return {
        grant_type: 'authorization_code',
        client_id,
        client_secret,
        code,
        redirect_uri: params.get('redirect_uri') || undefined,
        code_verifier: params.get('code_verifier') || undefined,
      } as const
    }

    case 'refresh_token': {
      const refresh_token = params.get('refresh_token')
      if (!refresh_token) {
        throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing refresh_token')
      }

      return {
        grant_type: 'refresh_token',
        client_id,
        client_secret,
        refresh_token,
      } as const
    }

    case 'client_credentials': {
      if (!client_secret) {
        throw new OAuth2Exception(ErrorMap.invalid_client, 'Missing client_secret')
      }

      return {
        grant_type: 'client_credentials',
        client_id,
        client_secret,
      } as const
    }

    case 'password': {
      const username = params.get('username')
      const password = params.get('password')

      if (!username || !password) {
        throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing username or password')
      }
      if (!client_secret) {
        throw new OAuth2Exception(ErrorMap.invalid_client, 'Missing client_secret')
      }

      return {
        grant_type: 'password',
        client_id,
        client_secret,
        username,
        password,
      } as const
    }

    default:
      throw new OAuth2Exception(ErrorMap.unsupported_grant_type, `Unsupported grant_type: ${grantType}`)
  }
}

/**
 * Parses an OAuth 2.0 token revocation request as defined in RFC 7009.
 *
 * The request must:
 * - Use HTTP POST
 * - Have Content-Type: application/x-www-form-urlencoded
 * - Include `token` parameter
 * - Authenticate confidential clients via client_id + client_secret
 *   (in body or Authorization: Basic header)
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7009#section-2.1
 * @param request - Incoming HTTP request
 * @returns Parsed revocation data: token, client credentials, and optional hint
 * @throws {OAuth2Exception} On invalid request, missing parameters, or parsing errors
 */
export const parseRevokeRequest = async (request: Request) => {
  // Method must be POST
  if (request.method !== 'POST') {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'HTTP method must be POST')
  }

  // Content-Type must be application/x-www-form-urlencoded
  const contentType = request.headers.get('Content-Type') || ''
  if (!contentType.includes('application/x-www-form-urlencoded')) {
    throw new OAuth2Exception(
      ErrorMap.invalid_request,
      'Content-Type must be application/x-www-form-urlencoded',
    )
  }

  // Read and parse body
  const bodyText = await request.text()
  const params = new URLSearchParams(bodyText)

  const token = params.get('token')
  if (!token) {
    throw new OAuth2Exception(ErrorMap.invalid_request, 'Missing token parameter')
  }

  // token_type_hint is optional
  const token_type_hint = (params.get('token_type_hint') || undefined) as 'access_token' | 'refresh_token' | undefined

  // Extract client_id and client_secret from body
  let client_id = params.get('client_id') || undefined
  let client_secret = params.get('client_secret') || undefined

  // Handle Authorization: Basic header (takes precedence for confidential clients)
  const authHeader = request.headers.get('Authorization')
  const auth = parseBasicAuth(authHeader)
  if (auth) {
    // If client_id is provided in body, it must match the one in the header
    if (client_id && client_id !== auth.username) {
      throw new OAuth2Exception(
        ErrorMap.invalid_request,
        'client_id in body does not match client_id in Authorization header',
      )
    }

    client_id = auth.username
    client_secret = auth.password
  }

  // client_id is REQUIRED for confidential clients, OPTIONAL for public clients
  // But we always return it if present; server will validate based on client type
  return {
    token,
    token_type_hint,
    client_id,
    client_secret,
  } as const
}
