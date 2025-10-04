export class OAuth2Error extends Error {
  override name: string = this.constructor.name
  public error!: string
  public errorDescription?: string
  public errorUri?: string

  constructor(options: {error?: string; description?: string; uri?: string}, errorOptions?: ErrorOptions) {
    super(options.description, errorOptions)
    this.error ??= options.error!
    this.errorDescription = options.description
    this.errorUri = options.uri
  }

  toJSON() {
    return {
      error: this.error,
      error_description: this.errorDescription,
      error_uri: this.errorUri,
    }
  }
}

export class OAuth2AccessDenied extends OAuth2Error {
  public override error: string = 'access_denied'
}
export class OAuth2InvalidClient extends OAuth2Error {
  public override error: string = 'invalid_client'
}
export class OAuth2InvalidGrant extends OAuth2Error {
  public override error: string = 'invalid_grant'
}
export class OAuth2InvalidRequest extends OAuth2Error {
  public override error: string = 'invalid_request'
}
export class OAuth2InvalidScope extends OAuth2Error {
  public override error: string = 'invalid_scope'
}

export class OAuth2ServerError extends OAuth2Error {
  public override error: string = 'server_error'
}

export class OAuth2TemporarilyUnavailable extends OAuth2Error {
  public override error: string = 'temporarily_unavailable'
}

export class OAuth2UnauthorizedClient extends OAuth2Error {
  public override error: string = 'unauthorized_client'
}
export class OAuth2UnsupportedGrantType extends OAuth2Error {
  public override error: string = 'unsupported_grant_type'
}
export class OAuth2UnsupportedResponseType extends OAuth2Error {
  public override error: string = 'unsupported_response_type'
}
