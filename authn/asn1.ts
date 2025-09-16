import {concat} from '@std/bytes/concat'
import type {Uint8Array_} from './types.ts'

/** Parse DER-sign ECDSA  */
export const decode_DER_ECDSA_Sign = (input: Uint8Array_): Uint8Array_ => {
  if (input[0] !== 0x30) throw new Error('Input is not an ASN.1 SEQUENCE')

  const {length: seqLength, consumed: seqLenBytes} = parseLength(input.subarray(1))
  const seqEnd = 1 + seqLenBytes + seqLength
  if (seqEnd !== input.length) throw new Error('Invalid sequence length')

  let currentOffset = 1 + seqLenBytes
  const elements: Uint8Array_[] = []

  for (let i = 0; i < 2; i++) {
    const byte = input[currentOffset]
    if (byte !== 0x02) throw new Error(`Expected INTEGER at position ${currentOffset}`)

    const lenInfo = parseLength(input.subarray(currentOffset + 1))
    const {length: intLength, consumed: intLenBytes} = lenInfo
    const valueStart = currentOffset + 1 + intLenBytes
    const valueEnd = valueStart + intLength

    const value = input.slice(valueStart, valueEnd)
    elements.push(value)

    currentOffset = valueEnd
  }

  if (currentOffset !== seqEnd) throw new Error('Extra data in SEQUENCE')

  if (elements.length !== 2) throw new Error('SEQUENCE must contain exactly two integers')

  let [r, s] = elements

  if (r[0] === 0x00 && r.length > 1 && (r[1] & 0x80) === 0) r = r.slice(1)
  if (r[0] & 0x80) r = concat([new Uint8Array([0x00]), r])

  if (s[0] === 0x00 && s.length > 1 && (s[1] & 0x80) === 0) s = s.slice(1)
  if (s[0] & 0x80) s = concat([new Uint8Array([0x00]), s])

  r = padToLength(r, 32)
  s = padToLength(s, 32)

  return concat([r, s])
}

const parseLength = (bytes: Uint8Array_): {length: number; consumed: number} => {
  const first = bytes[0]
  if (first < 0x80) {
    return {length: first, consumed: 1}
  } else {
    const numBytes = first & 0x7f
    let length = 0
    for (let i = 1; i <= numBytes; i++) {
      length = (length << 8) | bytes[i]
    }
    return {length, consumed: 1 + numBytes}
  }
}

const padToLength = (input: Uint8Array_, targetLength: number): Uint8Array_ => {
  if (input.length === targetLength) return input
  if (input.length > targetLength) {
    return input.slice(input.length - targetLength)
  }

  const padded = new Uint8Array(targetLength)
  padded.set(input, targetLength - input.length)
  return padded
}

export const decodeAsn1 = {
  DER_ECDSA_Sign: decode_DER_ECDSA_Sign,
}
