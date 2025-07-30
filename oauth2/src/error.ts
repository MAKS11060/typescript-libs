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

  toJSON() {
    return {
      error: this.error,
      errorDescription: this.errorDescription,
      errorUri: this.errorUri,
    }
  }
}

export const OAuth2Error = {
  access_denied: 'access_denied',
  invalid_client: 'invalid_client',
  invalid_grant: 'invalid_grant',
  invalid_request: 'invalid_request',
  invalid_scope: 'invalid_scope',
  server_error: 'server_error',
  temporarily_unavailable: 'temporarily_unavailable',
  unauthorized_client: 'unauthorized_client',
  unsupported_grant_type: 'unsupported_grant_type',
  unsupported_response_type: 'unsupported_response_type',
} as const
