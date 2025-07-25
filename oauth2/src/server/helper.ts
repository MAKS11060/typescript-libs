import { decodeBase64 } from '@std/encoding/base64'
import { ErrorMap, OAuth2Exception } from '../error.ts'
import { OAuth2TokenResponse } from '../oauth2.ts'
import { OAuth2AppConfig } from './server.ts'

export const ResponseType = [
  'code',
  'token',
] as const
export const GrantType = [
  'client_credentials',
  'authorization_code',
  'refresh_token',
  'password',
] as const

export type ResponseType = typeof ResponseType[number]
export type GrantType = typeof GrantType[number]

export const isResponseType = (type: unknown): type is ResponseType => {
  return ResponseType.includes(String(type) as ResponseType)
}
export const isGrantType = (type: unknown): type is GrantType => {
  return GrantType.includes(String(type) as GrantType)
}

export const generateToken = (options?: {expires_in?: number; refresh?: boolean}): OAuth2TokenResponse => {
  return {
    access_token: crypto.randomUUID(),
    token_type: 'Bearer',
    expires_in: options?.expires_in ?? 3600,
    ...(options?.refresh && {refresh_token: crypto.randomUUID()}),
  }
}

export const parseBasicAuth = (authorization?: string | null) => {
  if (!authorization?.startsWith('Basic')) return
  const [username, password] = new TextDecoder().decode(decodeBase64(authorization.slice(6))).split(':', 2)
  return {username, password}
}

export const getClientRedirectUri = (client: OAuth2AppConfig, redirect_uri?: string | null): string => {
  if (redirect_uri) {
    if (!client.redirectUri.includes(redirect_uri)) {
      throw new OAuth2Exception(ErrorMap.invalid_request)
    }
    return redirect_uri
  }

  // default redirect
  if (client.redirectUri.length === 1) {
    return client.redirectUri[0]
  }
  throw new OAuth2Exception(ErrorMap.invalid_request)
}
