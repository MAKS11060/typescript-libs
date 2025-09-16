/**
 * # WebAuthn
 * A server library for working with [`WebAuthn`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API)
 *
 * The library does not create additional abstractions, it only transparently transforms data that is convenient to work with.
 *
 * Based on types from `lib.dom`
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
 *   publicKey: PublicKeyCredential.parseCreationOptionsFromJSON(options),
 * })
 *
 * // Server
 * // https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions
 * import { credentials, publicKeyCredential } from '@maks11060/webauthn'
 * const cred = credentials.create({
 *   publicKey: {}
 * })
 * const options = cred.toJSON() // convert creation options to JSON
 * options // send to client
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
 * import { credentials, publicKeyCredential } from '@maks11060/webauthn'
 * const cred = credentials.get({
 *   publicKey: {}
 * })
 * const options = cred.toJSON() // convert request options to JSON
 * options // send to client
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
 * import { credentials, publicKeyCredential } from '@maks11060/webauthn'
 *
 * const cred = publicKeyCredential.fromJSON(data) // Parse PublicKeyCredential from JSON format
 * console.log(cred)
 *
 * // verify RP
 * if (!await publicKeyCredential.verifyRpIdHash(cred, 'example.com')) throw new Error('invalid RpId')
 *
 * // verify challenge
 * if (cred.clientData.challenge !== session.challenge) throw new Error('invalid challenge')
 *
 * // https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Attestation_and_Assertion
 * // register passkey
 * if (publicKeyCredential.isAttestation(cred)) {
 *   // find saved passkey using cred.id
 *   //   if (findPasskey(cred.id))
 *   //     return authorize()
 *   //   else
 *   //     1. extract publicKey
 *   //     2. registerPasskey()
 *
 *   console.log(cred.authData)
 *   console.log(cred.authData.attestedCredentialData)
 *   const publicKey = await publicKeyCredential.getPublicKey(cred)
 *
 *   // save passkey data (your implementation)
 *   registerPasskey({
 *     passkeyId: cred.id, // uniq passkey id
 *     passkeyUserId: 'passkeyUserId', // The user ID to associate with the passkey
 *     publicKey: cred.publicKey,
 *     publicKeyAlg: cred.publicKeyAlgorithm,
 *     backedUp: cred.attestation.authData.flags.backupState,
 *     aaguid: cred.attestation.authData.attestedCredentialData?.aaguid,
 *     transports: cred.transports,
 *   })
 *
 *   return // success / create session or add passkey to account
 * }
 *
 * // login with passkey
 * if (publicKeyCredential.isAssertion(cred)) {
 *   // minimal requirements
 *   // 1. find the passkey using cred.id
 *   // 2. check signature using saved public key
 *   // 3. next, any logic for creating a session or authorization token
 *
 *   console.log(cred.assertion)
 *   const passkey = findPasskeyById(cred.id)
 *   const publicKey = await publicKeyCredential.getPublicKey({
 *     publicKey: passkey.publicKey,
 *     publicKeyAlgorithm: passkey.publicKeyAlg
 *   }) // saved public key convert to CryptoKey
 *   if (!await publicKeyCredential.verifySignature(cred, publicKey))  throw new Error('invalid signature')
 *
 *   return // success / create session
 * }
 * ```
 *
 * @module
 */

export * from './aaguid.ts'
export * from './authn.ts'
export {pubKeyCredParams} from './types.ts'
