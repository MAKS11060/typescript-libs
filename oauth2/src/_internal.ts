import type {OAuth2TokenResponse} from './oauth2.ts'
import {type OAuth2Error, OAuth2Exception} from './error.ts'

export const handleOauth2Response = async <T>(response: Response): Promise<OAuth2TokenResponse<T>> => {
  const data: Record<string, any> = await response.json()

  // Check for errors in the response
  if (!response.ok || 'error' in data) {
    const errorData: OAuth2Error = {
      error: data.error || 'unknown_error',
      error_description: data.error_description || 'No additional information provided.',
      error_uri: data.error_uri,
    }

    throw new OAuth2Exception(errorData.error, errorData.error_description, errorData.error_uri)
  }

  // Return the parsed token response
  return data as OAuth2TokenResponse<T>
}

export const normalizeScope = (scope: string | string[]): string => {
  return Array.isArray(scope) ? scope.join(' ') : scope
}
