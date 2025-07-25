interface Client {
  type: 'confidential' | 'public'
  app_name: string
  client_id: string
  client_secret: string
  redirect_uri: Set<string>
}

const clients = new Map<string, Client>()
{
  const client_id = crypto.randomUUID()
  const client_secret = crypto.randomUUID()
  const redirect_uri = new Set<string>()
  redirect_uri.add('http://localhost:8000/api/oauth2/callback')
  clients.set(client_id, {
    type: 'confidential',
    app_name: 'test',
    client_id,
    client_secret,
    redirect_uri,
  })
}

// Authorization Endpoint
interface AuthorizationRequest {
  response_type: 'code'
  client_id: string
  redirect_uri?: string
  scope?: string
  state?: string
}

interface AuthorizationResponse {
  code: string
  state?: string
}

interface ErrorResponse {
  error:
    | 'access_denied'
    | 'invalid_request'
    | 'invalid_scope'
    | 'server_error'
    | 'temporarily_unavailable'
    | 'unauthorized_client'
    | 'unsupported_response_type'
  error_description?: string
  error_uri?: string
  state?: string
}

// Token Endpoint
/// Authorization Code Grant
interface AccessTokenRequest {
  grant_type: 'authorization_code'
  code: string
  redirect_uri?: string
  client_id: string
}
interface AccessTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: number
}

/// Implicit Grant
interface AuthorizationRequest_Implicit {
  response_type: 'token'
  client_id: string
  redirect_uri?: string
  scope?: string
  state?: string
}

////////////////////////////////////////////////////////////////
const checkAuthorize = (val: {client_id: string; redirect_uri: string; scope?: string}) => {
  for (const [id, client] of clients) {
    if (client.client_id !== val.client_id) continue
    if (!client.redirect_uri.has(val.redirect_uri)) continue
    return true
  }
}

const authorize = (input: AuthorizationRequest) => {
  /*
    if check: client_id, redirect_uri, scope
      if user prompt() === 'authorize'
        generate code
        save DB: code (10 min)
        return to redirect_uri (code, state)
      else
        return to redirect_uri (error=access_denied)
    else
      return to redirect_uri (error)
  */
  if (input.response_type === 'code') {
    if (checkAuthorize(input)) {
    } else {
    }
  }

  // if (input.response_type === 'token') {
  // }
}

const token = (input: {}) => {
  if (input.grant_type === 'authorization_code') {
    // code: string
    // client_id: string
    // redirect_uri?: string
    /*
      1. check: code
        if true
          1. {access_token, refresh_token? } = generateToken()
          2. save DB: refresh_token
          3. return json {
            token_type,
            access_token,
            refresh_token,
            expires_in,
          }
        else
          1. return json {
            error: '',
          }
    */

    const state = input.state as string
    return {
      code: '123',
      state,
    }
  }

  if (input.response_type === 'token') {
  }
}

const res1 = authorize({
  response_type: 'code',
  client_id: 'string',
})
// return
