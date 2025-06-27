/**
 * The PKCE module contains features for easy integration with OAuth2
 *
 * @example
 * ```ts
 * const {uri, codeVerifier} = await usePKCE(oauth2Authorize(config, state))
 * console.log(uri.toString()) // Example: "https://example.com/auth?code_challenge=sOmEchAllEngEhAsH&code_challenge_method=S256"
 * console.log(codeVerifier) // Example: "abcdef1234567890"
 * ```
 *
 * @module PKCE
 */

import {encodeBase64Url} from '@std/encoding/base64url'

/**
 * Represents a `PKCE` {@link https://datatracker.ietf.org/doc/html/rfc7636 (Proof Key for Code Exchange)} challenge.
 */
export interface PkceChallenge {
  /**
   * A high-entropy cryptographic random string used as the code verifier.
   */
  codeVerifier: string

  /**
   * The transformed code verifier sent to the authorization server.
   */
  codeChallenge: string

  /**
   * The method used to transform the code verifier into the code challenge.
   */
  codeChallengeMethod: 'S256' | 'plain'
}

const encoder = new TextEncoder()

const sha256 = (data: string) => crypto.subtle.digest('SHA-256', encoder.encode(data))

/**
 * Creates a PKCE (Proof Key for Code Exchange) challenge.
 *
 * This function generates a `codeVerifier` and transforms it into a `codeChallenge`
 * using either the S256 or plain method.
 *
 * @param {'S256' | 'plain'} [method='S256'] - The method to use for transforming the code verifier.
 * @returns {Promise<PkceChallenge>} A Promise that resolves with the generated PKCE challenge.
 * @example
 * ```ts
 * const pkce = await createPkceChallenge('S256')
 * console.log(pkce.codeVerifier) // Example: "abcdef1234567890"
 * console.log(pkce.codeChallenge) // Example: "sOmEchAllEngEhAsH"
 * console.log(pkce.codeChallengeMethod) // Example: "S256"
 * ```
 */
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

/**
 * Applies `PKCE` parameters to a given URL and returns the updated `URL` along with the code verifier.
 *
 * This function integrates `PKCE` into the `OAuth2` authorization flow by adding the `code_challenge`
 * and `code_challenge_method` parameters to the authorization `URL`.
 *
 * @param {URL} uri - The authorization `URL` to which `PKCE` parameters will be added.
 * @param {'S256'|'plain'} [method='S256'] - The method to use for transforming the code verifier.
 * @returns {Promise<{uri: URL; codeVerifier: string}>} A Promise that resolves with the updated `URL` and the code verifier.
 * @example
 * ```ts
 * const {uri, codeVerifier} = await usePKCE(oauth2Authorize(config, state))
 * console.log(uri.toString()) // Example: "https://example.com/auth?code_challenge=sOmEchAllEngEhAsH&code_challenge_method=S256"
 * console.log(codeVerifier) // Example: "abcdef1234567890"
 * ```
 */
export const usePKCE = async (
  uri: URL,
  method?: PkceChallenge['codeChallengeMethod']
): Promise<{uri: URL; codeVerifier: string}> => {
  const {codeChallenge, codeChallengeMethod, codeVerifier} = await createPkceChallenge(method)
  uri.searchParams.set('code_challenge', codeChallenge)
  uri.searchParams.set('code_challenge_method', codeChallengeMethod)
  return {uri, codeVerifier}
}
