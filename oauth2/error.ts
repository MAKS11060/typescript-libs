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
