/**
 * Lib for work with passkey provider AAGUID.
 *
 * List of known passkey providers from
 * https://github.com/passkeydeveloper/passkey-authenticator-aaguids/blob/main/aaguid.json
 *
 * - `formatAAGUID()` - convert raw aaguid to `uuid` format
 * - `getAAGUID(cred)` - extract aaguid in `uuid` format from `publicKeyCredentialFromJSON()`
 * - `getKnownAAGUID(cred)` - get known provider name and svg icon
 *
 * @module aaguid
 */

import {decodeHex} from '@std/encoding/hex'
import type {AuthnPublicKeyCredentialAttestation, Uint8Array_} from './types.ts'

import aaguidList from './aaguid.json' with {type: 'json'}

export interface AAGUID {
  name: string
  icon_dark?: string
  icon_light?: string
}

export type AAGUIDRecord = Record<string, AAGUID>

const empty = new Uint8Array(16)

/** get `AAGUID` in `uuid` format */
export const formatAAGUID = (bytes: Uint8Array_): string => {
  if (bytes.byteLength !== 16) throw new Error('The uuid must contain 16 bytes')

  const hex = []
  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i].toString(16).padStart(2, '0')
    hex.push(value)
  }

  // deno-fmt-ignore
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
}

/**
 * Get `AAGUID` in `uuid` format
 *
 * @example
 * ```ts
 * 'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4'
 * ```
 */
export const getAAGUID = (cred: AuthnPublicKeyCredentialAttestation): string => {
  return formatAAGUID(cred.attestation.authData.attestedCredentialData?.aaguid ?? empty)
}

/**
 * Get a {@link https://github.com/passkeydeveloper/passkey-authenticator-aaguids/blob/main/aaguid.json Known AAGUID}
 */
export const getKnownAAGUID = (cred: AuthnPublicKeyCredentialAttestation | Uint8Array_): AAGUID | null => {
  if (cred instanceof Uint8Array) {
    return (aaguidList as AAGUIDRecord)?.[formatAAGUID(cred)] ?? null
  }

  return (aaguidList as AAGUIDRecord)?.[getAAGUID(cred)] ?? null
}

/**
 * @param aaguid - string in `uuid` format. `ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4`
 * @returns Uint8Array
 *
 * @example
 * ```ts
 * const uuid = decodeAAGUID('ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4')
 * uuid // new Uint8Array([234, 155, 141, 102, 77, 1, 29, 33, 60, 228, 182, 180, 140, 181, 117, 212])
 * ```
 */
export const decodeAAGUID = (aaguid: string): Uint8Array_ => {
  const buf = decodeHex(aaguid.replaceAll('-', ''))
  if (buf.byteLength !== 16) throw new Error('The uuid must contain 16 bytes')

  return buf
}
