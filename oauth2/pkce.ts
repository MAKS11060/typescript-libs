import {encodeBase64Url} from 'jsr:@std/encoding/base64url'

export interface PkceChallenge {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: 'S256' | 'plain'
}

const encoder = new TextEncoder()

export const sha256 = (data: string) => crypto.subtle.digest('SHA-256', encoder.encode(data))

export const createPkceChallenge = async (
  method: PkceChallenge['codeChallengeMethod'] = 'S256'
): Promise<PkceChallenge> => {
  const codeVerifier = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  const codeChallenge = method === 'S256' ? encodeBase64Url(await sha256(codeVerifier)) : codeVerifier

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: method,
  }
}

export const pkceWrap = async (uri: URL) => {
  const {codeChallenge, codeChallengeMethod, codeVerifier} = await createPkceChallenge()
  uri.searchParams.set('code_challenge', codeChallenge)
  uri.searchParams.set('code_challenge_method', codeChallengeMethod)
  return {uri, codeVerifier}
}
