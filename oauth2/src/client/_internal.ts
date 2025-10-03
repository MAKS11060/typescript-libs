import {encodeBase64} from '@std/encoding/base64'
import {OAuth2Error} from '../error.ts'
import type {OAuth2Token} from '../oauth2.ts'

export const handleOauth2Response = async <T>(response: Response): Promise<OAuth2Token<T>> => {
  const data: Record<string, string> = await response.json()

  // Check for errors in the response
  if (!response.ok || 'error' in data) {
    throw new OAuth2Error({
      error: data.error ?? 'server_error',
      description: data.error_description || 'No additional information provided.',
      uri: data.error_uri,
    })
  }

  // Return the parsed token response
  return data as OAuth2Token<T>
}

export const normalizeScope = (scope: string | string[]): string => {
  if (Array.isArray(scope)) return scope.map((v) => v.trim()).join(' ')
  return scope
}

export const basicAuth = (username: string, password: string) => {
  return `Basic ${encodeBase64(`${username}:${password}`)}`
}
