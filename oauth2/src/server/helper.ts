import {decodeBase64} from '@std/encoding/base64'
import {encodeBase64Url} from '@std/encoding/base64url'
import {OAuth2InvalidClient, OAuth2InvalidRequest} from '../error.ts'
import type {ClientSecretCompare, OAuth2Client} from './server.ts'

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

export const parseBasicAuth = (authorization?: string | null) => {
  if (!authorization?.startsWith('Basic ')) return
  try {
    const [username, password] = new TextDecoder().decode(decodeBase64(authorization.slice(6))).split(':', 2)
    return {username, password}
  } catch (_e) {
    throw new OAuth2InvalidClient({description: 'Invalid base64 encoding in Authorization header'})
  }
}

export const getClientRedirectUri = (client: OAuth2Client, redirect_uri?: string | null): string => {
  if (redirect_uri) {
    try {
      const inputUri = new URL(redirect_uri)

      // OAuth2: redirect_uri no contain fragment
      if (inputUri.hash) {
        throw new OAuth2InvalidRequest({description: 'redirect_uri must not include fragment'})
      }

      if (!client.redirectUri.includes(redirect_uri)) {
        throw new OAuth2InvalidRequest({description: 'Invalid redirect_uri'})
      }

      return redirect_uri
    } catch (e) {
      if (e instanceof Error && e.name === 'OAuth2InvalidRequest') throw e
      throw new OAuth2InvalidRequest({description: 'Invalid redirect_uri format'})
    }
  }

  // default redirect
  if (client.redirectUri.length === 1) {
    return client.redirectUri[0]
  }

  throw new OAuth2InvalidRequest({description: 'Missing redirect_uri and client has multiple redirect_uris'})
}

const encoder = new TextEncoder()
export const clientSecretCompareSHA256_B64Url: ClientSecretCompare = async (client, clientSecret) => {
  return client.clientSecret === encodeBase64Url(
    await crypto.subtle.digest({name: 'SHA-256'}, encoder.encode(clientSecret)),
  )
}

//
export const parseScope = (scope?: string): string[] | null => {
  return scope ? scope.split(/[,\s]+/) : null
}
