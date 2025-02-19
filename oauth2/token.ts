import {OAuth2TokenResponse} from './oauth2.ts'

export interface OAuth2Token {
  tokenType: 'Bearer'
  expiresIn?: number
  accessToken: string
  refreshToken: string | null
  scope: string[]
}

export const oauth2Token = (token: OAuth2TokenResponse): OAuth2Token => {
  token.scope ??= ''

  return {
    tokenType: 'Bearer',
    expiresIn: token.expires_in,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || null,
    scope: token.scope ? token.scope.split(/[,\s]+/) : [],
  }
}
