import { ErrorMap, OAuth2Exception } from '../../error.ts'
import { parseBasicAuth } from '../helper.ts'
import { OAuth2GrantType } from '../server.ts'

// OAuth2GrantTypeAuthorizationCode
// OAuth2GrantTypeRefresh
// OAuth2GrantTypeCredentials
// OAuth2GrantTypePassword


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
export async function parseTokenRequest(request: Request): Promise<OAuth2GrantType> {
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
  const client_id = params.get('client_id')
  let client_secret = params.get('client_secret') || undefined

  // Handle Authorization: Basic header (takes precedence over body)
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

    // Use credentials from the header (more secure)
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
export async function parseRevokeRequest(request: Request) {
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
