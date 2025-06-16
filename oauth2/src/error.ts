export interface OAuth2Error {
  error: string
  error_description?: string
  error_uri?: string
}

export class OAuth2Exception extends Error {
  public error: string
  public errorDescription?: string
  public errorUri?: string

  constructor(error: string, description?: string, uri?: string) {
    super(`OAuth2 Error: ${error}`)
    this.error = error
    this.errorDescription = description
    this.errorUri = uri
  }
}

export const ErrorMap = {
  invalid_request: 'invalid_request',
  unauthorized_client: 'unauthorized_client',
  access_denied: 'access_denied',
  unsupported_response_type: 'unsupported_response_type',
  invalid_scope: 'invalid_scope',
  server_error: 'server_error',
  temporarily_unavailable: 'temporarily_unavailable',

  invalid_client: 'invalid_client',
  invalid_grant: 'invalid_grant',
  unsupported_grant_type: 'unsupported_grant_type',
} as const
