/**
 * Utilities for working with passkey provider AAGUIDs.
 *
 * Exports:
 * - `AAGUID` — provider metadata interface (`name`, optional `icon_dark`/`icon_light`).
 * - `Aaguid` — small Map wrapper for known AAGUIDs with helpers to `get`, `has`,
 *   `set`, and `delete` entries.
 * - `Aaguid.Format()` — convert a raw AAGUID (`Uint8Array`) or an attestation object
 *   to a UUID string.
 *
 * Known providers are loaded from the upstream JSON:
 * https://github.com/passkeydeveloper/passkey-authenticator-aaguids/blob/main/aaguid.json
 *
 * @module aaguid
 */

import aaguidList from './aaguid.json' with {type: 'json'}
import type {AuthnPublicKeyCredentialAttestation, Uint8Array_} from './types.ts'
import {stringify} from './uuid.ts'

export interface AAGUID {
  name: string
  icon_dark?: string
  icon_light?: string
}

/**
 * Map of known AAGUIDs to provider metadata.
 *
 * Keys are AAGUIDs in `UUID` string format `"00000000-0000-0000-0000-000000000000"`.
 * Values are objects with provider `name` and optional `icon_dark`/`icon_light`.
 */
export class Aaguid extends Map<string, AAGUID> {
  /**
   * Convert a raw AAGUID `Uint8Array(16)` or attestation object to a UUID string.
   * @param aaguid Raw AAGUID {@linkcode Uint8Array} or an attestation object containing it
   * @returns UUID string form of the AAGUID, or `undefined` when not found
   */
  static Format(aaguid: Uint8Array_ | AuthnPublicKeyCredentialAttestation): string | undefined {
    if (aaguid instanceof Uint8Array) return stringify(aaguid)
    if (aaguid.attestation.authData.attestedCredentialData?.aaguid) {
      return stringify(aaguid.attestation.authData.attestedCredentialData.aaguid)
    }
  }

  /**
   * Retrieve known AAGUID metadata by key.
   * @param key UUID string, `Uint8Array(16)` or an attestation object
   * @returns Provider metadata or `undefined` if unknown
   */
  override get(key: string | Uint8Array_ | AuthnPublicKeyCredentialAttestation): AAGUID | undefined {
    if (typeof key === 'string') return super.get(key.toLowerCase())
    if (key instanceof Uint8Array) return super.get(stringify(key))
    if (key.attestation.authData.attestedCredentialData?.aaguid) {
      return super.get(stringify(key.attestation.authData.attestedCredentialData.aaguid))
    }
  }

  /**
   * Check whether the AAGUID is known.
   * @param key UUID string, `Uint8Array(16)` or an attestation object
   * @returns `true` when a matching entry exists
   */
  override has(key: string | Uint8Array_ | AuthnPublicKeyCredentialAttestation): boolean {
    return !!this.get(key)
  }

  /**
   * Store provider metadata for a given AAGUID.
   * @param key UUID string or `Uint8Array(16)`
   * @param value Provider metadata
   * @returns The map instance
   */
  override set(key: string | Uint8Array_, value: AAGUID): this {
    if (typeof key === 'string') return super.set(key.toLowerCase(), value)
    if (key instanceof Uint8Array) return super.set(stringify(key), value)
    return this
  }

  /**
   * Delete an entry by AAGUID key.
   * @param key UUID string or `Uint8Array(16)`
   * @returns `true` if an entry was removed
   */
  override delete(key: string | Uint8Array_): boolean {
    if (typeof key === 'string') return super.delete(key.toLowerCase())
    if (key instanceof Uint8Array) return super.delete(stringify(key))
    return false
  }
}

/**
 * Instance Map of known AAGUIDs to provider metadata.
 */
export const aaguid: Aaguid = new Aaguid(Object.entries(aaguidList))
