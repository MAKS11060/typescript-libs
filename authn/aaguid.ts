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

import { decodeHex } from '@std/encoding/hex'
import type { AuthnPublicKeyCredentialAttestation } from './types.ts'

import aaguidList from './aaguid.json' with { type: 'json' }

export interface AAGUID {
  name: string
  icon_dark?: string
  icon_light?: string
}

export type AAGUIDRecord = Record<string, AAGUID>

/** get `AAGUID` in `uuid` format */
export const formatAAGUID = (bytes: Uint8Array): string => {
  const hex = []
  for (let i = 0; i < bytes.length; i++) {
    const value = bytes[i].toString(16).padStart(2, '0')
    hex.push(value)
  }

  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${
    hex[11]
  }${hex[12]}${hex[13]}${hex[14]}${hex[15]}`
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
  return formatAAGUID(cred.attestation.authData.attestedCredentialData?.aaguid!)
}

/**
 * Get a {@link https://github.com/passkeydeveloper/passkey-authenticator-aaguids/blob/main/aaguid.json Known AAGUID}
 */
export const getKnownAAGUID = (cred: AuthnPublicKeyCredentialAttestation): AAGUID | null => {
  const id = getAAGUID(cred)
  return (aaguidList as AAGUIDRecord)?.[id] ?? null
}

export const AAGUIDtoBytes = (aaguid: string): Uint8Array<ArrayBuffer> => {
  return decodeHex(aaguid.replaceAll('-', ''))
}
