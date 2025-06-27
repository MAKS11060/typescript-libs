export type ResponseType = 'code' | 'token'
export type GrantType = 'client_credentials' | 'authorization_code' | 'refresh_token' | 'password'

export const isResponseType = (type: unknown): type is ResponseType => {
  const expected = [
    'code',
    'token',
  ]
  return expected.includes(String(type))
}

export const isGrantType = (type: unknown): type is GrantType => {
  const expected = [
    'client_credentials',
    'authorization_code',
    'refresh_token',
    'password',
  ]
  return expected.includes(String(type))
}
