/**
 * # WebAuthn
 * A server library for working with [`WebAuthn`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
 *
 * The library does not create additional abstractions, it only transparently transforms data that is convenient to work with.
 *
 * Based on types from `lib.dom`
 * ```json
 * "compilerOptions": {
 *  "lib": [
 *    "dom"
 *  ]
 * }
 * ```
 *
 * It is recommended to use the following libraries for the client code
 * - [`@types/webappsec-credential-management`](https://www.npmjs.com/package/@types/webappsec-credential-management)
 *
 * List of useful articles:
 * - [Web Authentication API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
 * - [Create a passkey for passwordless logins](https://web.dev/articles/passkey-registration)
 * - [Server-side passkey registration](https://developers.google.com/identity/passkeys/developer-guides/server-registration)
 * - [Sign in with a passkey through form autofill](https://web.dev/articles/passkey-form-autofill)
 * - [Determine the passkey provider with AAGUID](https://web.dev/articles/webauthn-aaguid)
 * - [Keep passkeys consistent with credentials on your server with the Signal API](https://developer.chrome.com/docs/identity/webauthn-signal-api#signal-a-list-of-saved-credentials)
 *
 * @example Register passkey
 * ```ts
 * // Client request options from server to register passkey
 * const publicKeyCredential = await navigator.credentials.create({
 *   publicKey: PublicKeyCredential.parseCreationOptionsFromJSON( options ),
 * })
 *
 * // Server
 * // https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions
 * import { publicKeyCreateOptionsToJSON } from '@maks11060/webauthn'
 * const options = publicKeyCreateOptionsToJSON({}) // convert creation options to JSON
 * ```
 *
 * @example Login with passkey
 * ```ts
 * // Client request options from server to login with passkey
 * const publicKeyCredential = await navigator.credentials.get({
 *   publicKey: PublicKeyCredential.parseRequestOptionsFromJSON( options ),
 * })
 *
 * // Server
 * // https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialRequestOptions
 * import { publicKeyRequestOptionsToJSON } from '@maks11060/webauthn'
 * const options = publicKeyRequestOptionsToJSON({}) // convert request options to JSON
 * ```
 *
 * @example Verify
 * ```ts
 * // Client
 * const cred = await navigator.credentials.get({
 *   publicKey: PublicKeyCredential.parseRequestOptionsFromJSON({}),
 * })
 * const data = cred.toJSON() // Post credentials to server
 *
 * // Server
 * import {
 *   getPublicKey,
 *   isAssertion,
 *   isAttestation,
 *   publicKeyCredentialFromJSON,
 *   verifyRpIdHash,
 *   verifySignature,
 * } from '@maks11060/webauthn'
 * const cred = publicKeyCredentialFromJSON(data) // Parse PublicKeyCredential from JSON format
 * console.log(cred)
 *
 * // https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Attestation_and_Assertion
 * // register passkey
 * if (isAttestation(cred)) {
 *   console.log(cred.authData)
 *   console.log(cred.authData.attestedCredentialData)
 *   const publicKey = await getPublicKey(cred)
 * }
 *
 * // login with passkey
 * if (isAssertion(cred)) {
 *   console.log(cred)
 *   console.log(cred.authData)
 *   console.log(cred.assertion)
 *   console.log(cred.assertion.userHandle)
 * }
 * ```
 *
 * @module
 */

export * from './aaguid.ts'
export * from './authn.ts'
export * from './types.ts'

