import {decodeBase64} from '@std/encoding/base64'
import {encodeBase64Url} from '@std/encoding/base64url'
import {OAuth2InvalidClient, OAuth2InvalidRequest} from '../error.ts'
import type {ClientSecretCompare, OAuth2Client} from './server.ts'

export const ResponseType = {
  Code: 'code',
  Token: 'token',
} as const
export const GrantType = {
  ClientCredentials: 'client_credentials',
  AuthorizationCode: 'authorization_code',
  RefreshToken: 'refresh_token',
  Password: 'password',
} as const

export type ResponseType = typeof ResponseType[keyof typeof ResponseType]
export type GrantType = typeof GrantType[keyof typeof GrantType]

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const parseBasicAuth = (authorization?: string | null) => {
  if (!authorization?.startsWith('Basic ')) return
  try {
    const [username, password] = decoder.decode(decodeBase64(authorization.slice(6))).split(':', 2)
    return {username, password}
  } catch (e) {
    throw new OAuth2InvalidClient({description: 'Invalid base64 encoding in Authorization header'}, {cause: e})
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
      if (e instanceof OAuth2InvalidRequest) throw e
      throw new OAuth2InvalidRequest({description: 'Invalid redirect_uri format'})
    }
  }

  // default redirect
  if (client.redirectUri.length === 1) {
    return client.redirectUri[0]
  }

  throw new OAuth2InvalidRequest({description: 'Missing redirect_uri and client has multiple redirect_uris'})
}

export const defaultGenerateCode = () => {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
}

export const clientSecretCompareRaw: ClientSecretCompare = (client, clientSecret) => {
  return client.clientSecret === clientSecret
}

export const clientSecretCompareSHA256_B64Url: ClientSecretCompare = async (client, clientSecret) => {
  return client.clientSecret === encodeBase64Url(
    await crypto.subtle.digest({name: 'SHA-256'}, encoder.encode(clientSecret)),
  )
}

export const parseScope = (scope?: string): string[] | null => {
  return scope ? scope.split(/[,\s]+/) : null
}
