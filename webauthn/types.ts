export type Uint8Array_ = ReturnType<Uint8Array['slice']>

/** {@link https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredential/toJSON MDN} */
export interface PublicKeyCredentialJSON {
  id: string
  rawId: string
  authenticatorAttachment: AuthenticatorAttachment
  type: 'public-key'
  clientExtensionResults: any // TODO
  response:
    | PublicKeyCredentialResponseAttestationJSON
    | PublicKeyCredentialResponseAssertionJSON
}

export interface PublicKeyCredentialResponseAttestationJSON {
  attestationObject: string
  authenticatorData: string
  clientDataJSON: string
  publicKey: string
  publicKeyAlgorithm: number
  transports: AuthenticatorTransport[]
}

export interface PublicKeyCredentialResponseAssertionJSON {
  authenticatorData: string
  clientDataJSON: string
  signature: string
  userHandle?: string | null
}

/** {@link https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorResponse/clientDataJSON MDN} */
export interface ClientDataJSON {
  type: 'webauthn.create' | 'webauthn.get'
  challenge: string
  crossOrigin: boolean
  origin: string
  /** @deprecated */
  tokenBinding?: {
    status: 'supported' | 'present'
    id: string
  }
  /**
   * Contains the fully qualified top-level origin of the relying party.
   *
   * It is set only if it {@linkcode ClientDataJSON.crossOrigin} is `true`.
   */
  topOrigin?: string
}

/** {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data MDN} */
export type AuthenticatorData = {
  /**
   * `SHA-256` hash of the `RP ID`
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#rpidhash MDN}
   */
  rpIdHash: Uint8Array_

  /**
   * Representation of flags as an object
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#flags MDN}
   */
  flags: AuthenticatorDataFlags

  /**
   * A bitfield that indicates various attributes that were asserted by the authenticator
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#flags MDN}
   */
  rawFlags: number

  /**
   * A signature counter, if supported by the authenticator (set to 0 otherwise).
   * Servers may optionally use this counter to detect authenticator cloning
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#signcount MDN}
   */
  signCount: number

  /**
   * The credential that was created. This is only present during a
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/CredentialsContainer/create navigator.credentials.create()} call
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#attestedcredentialdata MDN}
   */
  attestedCredentialData?: AuthenticatorDataAttestedCredentialData

  /**
   * An optional `CBOR` map containing the response outputs from extensions processed by the authenticator
   *
   * {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#extensions MDN}
   */
  extensions?: Uint8Array_
}

/** {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#flags MDN} */
export interface AuthenticatorDataFlags {
  /** `UP` User Present */
  userPresent: boolean
  /** `UV` User Verified */
  userVerified: boolean
  /** `BE` Backup Eligibility */
  backupEligibility: boolean
  /** `BS` Backup State */
  backupState: boolean
  /** `AT` Attested credential Data */
  attestedCredentialData: boolean
  /** `ED` Extension data */
  extensionData: boolean
}

/** {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data#attestedcredentialdata MDN} */
export interface AuthenticatorDataAttestedCredentialData {
  /**
   * The Authenticator Attestation Globally Unique Identifier
   *
   * - `16 Bytes` contains `uuid`
   */
  aaguid: Uint8Array_

  /** The length of the credential ID that immediately follows these bytes */
  credentialIdLength: number

  /** A unique identifier for this credential so that it can be requested for future authentications */
  credentialId: Uint8Array_

  /** A `COSE`-encoded public key */
  credentialPublicKey: Uint8Array_
}

// === attStmt ===
/**
 * The actual attStmt structure depends on `fmt`.
 */
type AttestationStatementFormat =
  | {fmt: 'packed'; attStmt: PackedAttestationStatement}
  | {fmt: 'tpm'; attStmt: TpmAttestationStatement}
  | {fmt: 'android-key'; attStmt: AndroidKeyAttestationStatement}
  | {fmt: 'android-safetynet'; attStmt: AndroidSafetyNetAttestationStatement}
  | {fmt: 'fido-u2f'; attStmt: FidoU2fAttestationStatement}
  | {fmt: 'none'; attStmt: NoneAttestationStatement}

/**
 * `"packed"` format
 * Most common for security keys and platform authenticators.
 */
type PackedAttestationStatement = {
  alg: COSEAlgorithmIdentifier
  sig: Uint8Array_
  x5c?: Uint8Array_[] // X.509 certificate chain (optional)
  ecdaaKeyId?: Uint8Array_ // Only if ECDAA used
}

/**
 * `"tpm"` format
 * Complex: includes TPMS_ATTEST, signature, etc.
 */
type TpmAttestationStatement = {
  ver: string
  tpmsAttest: Uint8Array_ // CBOR-encoded TPMS_ATTEST structure
  certInfo: Uint8Array_ // Hash of signed part
  sig: Uint8Array_
  alg: COSEAlgorithmIdentifier
  x5c?: Uint8Array_[]
}

/**
 * `"android-key"` or `"android-safetynet"`
 * Both use JWK-style public key + cert chain.
 */
type AndroidKeyAttestationStatement = {
  alg: COSEAlgorithmIdentifier
  sig: Uint8Array_
  x5c: Uint8Array_[]
}

type AndroidSafetyNetAttestationStatement = {
  ver: string // Version of the SafetyNet API
  response: Uint8Array_ // Signed JWT from Google
}

/**
 * `"fido-u2f"` format
 * Used by U2F-style devices (e.g., older YubiKeys).
 */
type FidoU2fAttestationStatement = {
  alg: -7 // ES256 (required)
  sig: Uint8Array_
  x5c: Uint8Array_[] // Always present, at least one cert
}

/**
 * `"none"` format
 * No attestation — just basic authData.
 */
type NoneAttestationStatement = Record<never, never>

/**
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject MDN}
 *
 * @example
 * ```ts
 * if (cred.attestation.fmt === 'packed') {
 *   cred.attestation.attStmt.alg
 *   cred.attestation.attStmt.sig
 * }
 * ```
 */
export type AttestationObject = {
  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data MDN Authenticator data} */
  authData: AuthenticatorData
  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject#fmt MDN} */
  fmt: AttestationObjectFmt
} & AttestationStatementFormat

export interface AuthnPublicKeyCredential {
  authenticatorAttachment: AuthenticatorAttachment
  clientExtensionResults: {}
  id: string
  rawId: Uint8Array_

  type: 'public-key'

  // response
  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Authentication_API/Authenticator_data MDN Authenticator data} */
  authData: AuthenticatorData
  rawAuthData: Uint8Array_

  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorResponse/clientDataJSON MDN} */
  clientData: ClientDataJSON
  rawClientData: Uint8Array_

  // Attestation (Optional)
  /** {@link https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/attestationObject MDN} */
  attestation?: AttestationObject
  rawAttestation?: Uint8Array_

  /** Get `Attestation` publicKey */
  publicKey?: Uint8Array_

  /** Get `Attestation` {@link https://www.iana.org/assignments/cose/cose.xhtml#algorithms COSE Algorithm Identifier} */
  publicKeyAlgorithm?: number

  transports?: AuthenticatorTransport[]

  // Assertion (Optional)
  /**
   * `Assertion` signature
   *
   * ## Notes
   * | alg  | alg name            | sign format |
   * | ---: | :---                | ---         |
   * | -7   | `ECDSA P-256`       | `ASN.1 DER` |
   * | -8   | `Ed25519`           | `RAW`       |
   * | -257 | `RSASSA-PKCS1-v1_5` | `RAW`       |
   */
  signature?: Uint8Array_

  /** User identifier, specified as `user.id` in the options passed to the originating `navigator.credentials.create()` */
  userHandle?: Uint8Array_ | null
}

export interface AuthnPublicKeyCredentialAttestation {
  attestation: AttestationObject
  rawAttestation: Uint8Array_
  publicKey: Uint8Array_
  publicKeyAlgorithm: number
  transports: AuthenticatorTransport[]
}

export interface AuthnPublicKeyCredentialAssertion {
  signature: Uint8Array_
  userHandle: Uint8Array_ | null
}

// === lib.dom ===
// Credentials
export interface CredentialCreationOptions {
  publicKey?: PublicKeyCredentialCreationOptions
  // signal?: AbortSignal
}

// Create
interface PublicKeyCredentialCreationOptions {
  attestation?: AttestationConveyancePreference
  authenticatorSelection?: AuthenticatorSelectionCriteria
  challenge: Uint8Array_
  excludeCredentials?: PublicKeyCredentialDescriptor[]
  extensions?: AuthenticationExtensionsClientInputs
  pubKeyCredParams: PublicKeyCredentialParameters[]
  rp: PublicKeyCredentialRpEntity
  timeout?: number
  user: PublicKeyCredentialUserEntity
}

interface AuthenticatorSelectionCriteria {
  authenticatorAttachment?: AuthenticatorAttachment
  requireResidentKey?: boolean
  residentKey?: ResidentKeyRequirement
  userVerification?: UserVerificationRequirement
}

interface PublicKeyCredentialParameters {
  alg: COSEAlgorithmIdentifier
  type: PublicKeyCredentialType
}

interface PublicKeyCredentialEntity {
  name: string
}

interface PublicKeyCredentialRpEntity extends PublicKeyCredentialEntity {
  id?: string
}

interface PublicKeyCredentialUserEntity extends PublicKeyCredentialEntity {
  displayName: string
  id: Uint8Array_
}

interface PublicKeyCredentialDescriptor {
  id: Uint8Array_
  transports?: AuthenticatorTransport[]
  type: PublicKeyCredentialType
}

interface AuthenticationExtensionsClientInputs {
  appid?: string
  credProps?: boolean
  credentialProtectionPolicy?: string
  enforceCredentialProtectionPolicy?: boolean
  hmacCreateSecret?: boolean
  largeBlob?: AuthenticationExtensionsLargeBlobInputs
  minPinLength?: boolean
  prf?: AuthenticationExtensionsPRFInputs
}

interface AuthenticationExtensionsLargeBlobInputs {
  support?: 'preferred' | 'required'
  read?: boolean
  write?: Uint8Array_
}

interface AuthenticationExtensionsPRFInputs {
  eval?: AuthenticationExtensionsPRFValues
  evalByCredential?: Record<string, AuthenticationExtensionsPRFValues>
}

interface AuthenticationExtensionsPRFValues {
  first: Uint8Array_
  second?: Uint8Array_
}

// Create JSON
export interface PublicKeyCredentialCreationOptionsJSON {
  attestation?: string
  authenticatorSelection?: AuthenticatorSelectionCriteria
  challenge: string
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[]
  extensions?: AuthenticationExtensionsClientInputsJSON
  hints?: string[]
  pubKeyCredParams: PublicKeyCredentialParameters[]
  rp: PublicKeyCredentialRpEntity
  timeout?: number
  user: PublicKeyCredentialUserEntityJSON
}
interface PublicKeyCredentialDescriptorJSON {
  id: string
  transports?: string[]
  type: string
}
interface AuthenticationExtensionsClientInputsJSON {
  appid?: string
  credProps?: boolean
  largeBlob?: AuthenticationExtensionsLargeBlobInputsJSON
  prf?: AuthenticationExtensionsPRFInputsJSON
}
interface AuthenticationExtensionsLargeBlobInputsJSON {
  read?: boolean
  support?: string
  write?: string
}
interface AuthenticationExtensionsPRFInputsJSON {
  eval?: AuthenticationExtensionsPRFValuesJSON
  evalByCredential?: Record<string, AuthenticationExtensionsPRFValuesJSON>
}
interface AuthenticationExtensionsPRFValuesJSON {
  first: string
  second?: string
}
interface PublicKeyCredentialUserEntityJSON {
  displayName: string
  id: string
  name: string
}

// Get
export interface CredentialRequestOptions {
  // mediation?: CredentialMediationRequirement;
  publicKey?: PublicKeyCredentialRequestOptions
  // signal?: AbortSignal;
}

interface PublicKeyCredentialRequestOptions {
  allowCredentials?: PublicKeyCredentialDescriptor[]
  challenge: Uint8Array_
  extensions?: AuthenticationExtensionsClientInputs
  rpId?: string
  timeout?: number
  userVerification?: UserVerificationRequirement
}

// Get JSON
export interface PublicKeyCredentialRequestOptionsJSON {
  allowCredentials?: PublicKeyCredentialDescriptorJSON[]
  challenge: string
  extensions?: AuthenticationExtensionsClientInputsJSON
  hints?: string[]
  rpId?: string
  timeout?: number
  userVerification?: string
}

//
type AttestationConveyancePreference = 'direct' | 'enterprise' | 'indirect' | 'none'
type AuthenticatorAttachment = 'cross-platform' | 'platform'
type ResidentKeyRequirement = 'discouraged' | 'preferred' | 'required'
type UserVerificationRequirement = 'discouraged' | 'preferred' | 'required'
type COSEAlgorithmIdentifier = number
type PublicKeyCredentialType = 'public-key'
type AuthenticatorTransport = 'ble' | 'hybrid' | 'internal' | 'nfc' | 'usb'
type AttestationObjectFmt = 'packed' | 'tpm' | 'android-key' | 'android-safetynet' | 'fido-u2f' | 'none'

/**
 * A recommended set of algorithms that covers all devices. The list is taken from
 * [MDN](https://developer.mozilla.org/en-US/docs/Web/API/PublicKeyCredentialCreationOptions#pubkeycredparams)
 *
 * |    alg | name                        |
 * | :----: | --------------------------- |
 * |   `-8` | `Ed25519`                   |
 * |   `-7` | `ECDSA P-256`               |
 * | `-257` | `RSASSA-PKCS1-v1_5 SHA-256` |
 *
 * @example
 * ```ts
 * const cred = credentials.create({
 *   publicKey: {
 *     pubKeyCredParams
 *   }
 * })
 * ```
 */
export const pubKeyCredParams = [
  {type: 'public-key', alg: -8}, //   Ed25519
  {type: 'public-key', alg: -7}, //   ECDSA              P-256
  {type: 'public-key', alg: -257}, // RSASSA-PKCS1-v1_5  SHA-256
] as PublicKeyCredentialParameters[]

export const verifyOptionsByKey = new Map([
  ['Ed25519', {name: 'Ed25519'}],
  ['ECDSA', {name: 'ECDSA', hash: 'SHA-256'}],
  ['RSASSA-PKCS1-v1_5', {name: 'RSASSA-PKCS1-v1_5'}],
])

export const alg = new Map([
  [-7, {name: 'ECDSA', namedCurve: 'P-256'}], // ECDSA with P-256 and SHA-256
  [-8, {name: 'Ed25519'}], // EdDSA with Ed25519
  // [-35, {name: 'ECDSA', namedCurve: 'P-384'}], // ECDSA with P-384 and SHA-384
  // [-36, {name: 'ECDSA', namedCurve: 'P-521'}], // ECDSA with P-521 and SHA-512

  // [-40, {name: 'EdDSA', namedCurve: 'Ed448'}], // TODO: TEST
  // [-47, {name: 'ECDSA', namedCurve: 'secp256k1'}], // TODO: TEST

  [-257, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256'}], // RSASSA-PKCS1-v1_5 with SHA-256
  // [-258, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384'}], // RSASSA-PKCS1-v1_5 with SHA-384
  // [-259, {name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512'}], // RSASSA-PKCS1-v1_5 with SHA-512

  // [-260, {name: 'RSA_PSS', hash: 'SHA-256'}], // TODO: TEST
  // [-261, {name: 'RSA_PSS', hash: 'SHA-384'}], // TODO: TEST
  // [-262, {name: 'RSA_PSS', hash: 'SHA-512'}], // TODO: TEST
])
