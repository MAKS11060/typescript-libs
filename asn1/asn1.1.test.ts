import { concat } from '@std/bytes/concat'
import { decodeBase64Url } from '@std/encoding/base64url'
import { expect } from 'jsr:@std/expect/expect'

type Asn1Primitive =
  | {INTEGER: number | 'variable'}
  | {OCTET_STRING: number | 'variable'}
  | {BIT_STRING: number | 'variable'}

type Asn1Field =
  | Asn1Primitive
  // | {SEQUENCE: Asn1Field[]}
  | {SEQUENCE: (Asn1Field | NamedField)[]}
  | {'SEQUENCE OF': Asn1Field}

type NamedField = {
  name: string
  schema: Asn1Field
}

type Asn1Schema = Asn1Field | {SEQUENCE: (Asn1Field | NamedField)[]}

//  === Parser ===
type ParseResult<S extends Asn1Schema | unknown> = S extends {INTEGER: infer L}
  ? (L extends 'variable' ? bigint : Uint8Array<ArrayBuffer>)
  : S extends {OCTET_STRING: infer L} ? Uint8Array<ArrayBuffer>
  : S extends {BIT_STRING: infer L} ? Uint8Array<ArrayBuffer>
  : S extends {SEQUENCE: (Asn1Field | NamedField)[]} ? {
      [F in S['SEQUENCE'][number] as F extends NamedField ? F['name'] : never]: F extends NamedField
        ? ParseResult<F['schema']>
        : never
    }
  : S extends {SEQUENCE: Asn1Field[]} ? { [K in keyof S['SEQUENCE']]: ParseResult<S['SEQUENCE'][K]> }
  : S extends {'SEQUENCE OF': infer Item} ? ParseResult<Item & Asn1Field>[]
  : never

//
const parse = <S extends Asn1Schema>(schema: S, input: Uint8Array<ArrayBuffer>): ParseResult<S> => {
  const {value} = parseElement(schema, input, 0)
  return value as ParseResult<S>
}

const parseElement = (
  schema: Asn1Schema,
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
): {value: any; consumed: number} => {
  if ('SEQUENCE' in schema) {
    return parseSequence(schema.SEQUENCE, bytes, offset)
  } else if ('INTEGER' in schema) {
    return parseInteger(bytes, offset, schema.INTEGER)
  } else if ('OCTET_STRING' in schema) {
    return parseOctetString(bytes, offset, schema.OCTET_STRING)
  } else if ('BIT_STRING' in schema) {
    return parseBitString(bytes, offset, schema.BIT_STRING)
  } else if ('SEQUENCE OF' in schema) {
    return parseSequenceOf(schema['SEQUENCE OF'], bytes, offset)
  }
  throw new Error('Unsupported schema type')
}

const parseSequence = (
  fields: (Asn1Field | NamedField)[],
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
): {value: any; consumed: number} => {
  if (bytes[offset] !== 0x30) {
    throw new Error(`Expected SEQUENCE (0x30), got ${bytes[offset]?.toString(16)}`)
  }

  const lenInfo = parseLength(bytes, offset + 1)
  const seqStart = offset + 1 + lenInfo.consumed
  const seqEnd = seqStart + lenInfo.length
  let currentOffset = seqStart

  const result: any = {}
  let index = 0

  for (const field of fields) {
    if ('name' in field && 'schema' in field) {
      const {value, consumed} = parseElement(field.schema, bytes, currentOffset)
      result[field.name] = value
      currentOffset += consumed
    } else {
      const {value, consumed} = parseElement(field, bytes, currentOffset)
      result[index] = value
      currentOffset += consumed
      index++
    }
  }

  if (currentOffset !== seqEnd) {
    throw new Error('Invalid SEQUENCE: extra data or missing elements')
  }

  return {
    value: result,
    consumed: seqEnd - offset,
  }
}

const parseInteger = (
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
  expectedLength: number | 'variable',
): {value: Uint8Array<ArrayBuffer>; consumed: number} => {
  if (bytes[offset] !== 0x02) {
    throw new Error(`Expected INTEGER (0x02), got ${bytes[offset]?.toString(16)}`)
  }

  const lenInfo = parseLength(bytes, offset + 1)
  const valueStart = offset + 1 + lenInfo.consumed
  const valueEnd = valueStart + lenInfo.length
  let value = bytes.slice(valueStart, valueEnd)

  // Normalize sign
  if (value[0] === 0x00 && value.length > 1 && (value[1] & 0x80) === 0) {
    value = value.slice(1)
  }
  if (value[0] & 0x80) {
    const padded = new Uint8Array(value.length + 1)
    padded.set(value, 1)
    value = padded
  }

  if (expectedLength !== 'variable') {
    value = padToLength(value, expectedLength)
  }

  return {
    value,
    consumed: valueEnd - offset,
  }
}

const parseOctetString = (
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
  expectedLength: number | 'variable',
): {value: Uint8Array<ArrayBuffer>; consumed: number} => {
  if (bytes[offset] !== 0x04) {
    throw new Error(`Expected OCTET STRING (0x04), got ${bytes[offset]?.toString(16)}`)
  }

  const lenInfo = parseLength(bytes, offset + 1)
  const valueStart = offset + 1 + lenInfo.consumed
  const valueEnd = valueStart + lenInfo.length
  let value = bytes.slice(valueStart, valueEnd)

  if (expectedLength !== 'variable' && value.length !== expectedLength) {
    throw new Error(`OCTET STRING length mismatch: expected ${expectedLength}, got ${value.length}`)
  }

  return {
    value,
    consumed: valueEnd - offset,
  }
}

const parseBitString = (
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
  expectedLength: number | 'variable',
): {value: Uint8Array<ArrayBuffer>; consumed: number} => {
  if (bytes[offset] !== 0x03) {
    throw new Error(`Expected BIT STRING (0x03), got ${bytes[offset]?.toString(16)}`)
  }

  const lenInfo = parseLength(bytes, offset + 1)
  const valueStart = offset + 1 + lenInfo.consumed
  const valueEnd = valueStart + lenInfo.length

  // Первый байт - количество неиспользуемых бит
  const unusedBits = bytes[valueStart]
  if (unusedBits !== 0) {
    throw new Error(`Non-zero unused bits in BIT STRING: ${unusedBits}`)
  }

  let value = bytes.slice(valueStart + 1, valueEnd)

  if (expectedLength !== 'variable' && value.length !== expectedLength) {
    throw new Error(`BIT STRING length mismatch: expected ${expectedLength}, got ${value.length}`)
  }

  return {
    value,
    consumed: valueEnd - offset,
  }
}

const parseSequenceOf = (
  itemSchema: Asn1Field,
  bytes: Uint8Array<ArrayBuffer>,
  offset: number,
): {value: any[]; consumed: number} => {
  if (bytes[offset] !== 0x30) {
    throw new Error(`Expected SEQUENCE (0x30), got ${bytes[offset]?.toString(16)}`)
  }

  const lenInfo = parseLength(bytes, offset + 1)
  const seqStart = offset + 1 + lenInfo.consumed
  const seqEnd = seqStart + lenInfo.length
  let currentOffset = seqStart

  const result: any[] = []

  while (currentOffset < seqEnd) {
    const {value, consumed} = parseElement(itemSchema, bytes, currentOffset)
    result.push(value)
    currentOffset += consumed
  }

  if (currentOffset !== seqEnd) {
    throw new Error('Invalid SEQUENCE OF: parsing error')
  }

  return {
    value: result,
    consumed: seqEnd - offset,
  }
}

// === HELPERS ===
const parseLength = (bytes: Uint8Array<ArrayBuffer>, offset: number): {length: number; consumed: number} => {
  const first = bytes[offset]
  if (first < 0x80) {
    return {length: first, consumed: 1}
  } else {
    const numBytes = first & 0x7f
    let length = 0
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | bytes[offset + 1 + i]
    }
    return {length, consumed: 1 + numBytes}
  }
}

const padToLength = (input: Uint8Array<ArrayBuffer>, targetLength: number): Uint8Array<ArrayBuffer> => {
  if (input.length === targetLength) return input
  if (input.length > targetLength) {
    return input.slice(input.length - targetLength)
  }
  const padded = new Uint8Array(targetLength)
  padded.set(input, targetLength - input.length)
  return padded
}

// --- ASN.1 Schemas ---
// ECDSA Signature
const DER_ECDSA_SIGN = {
  SEQUENCE: [
    {name: 'r', schema: {INTEGER: 32}},
    {name: 's', schema: {INTEGER: 32}},
  ],
} as const satisfies Asn1Schema

export const parseDerEcdsaSign = (sign: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
  const {r, s} = parse(DER_ECDSA_SIGN, sign)
  return concat([r, s])
}

Deno.test('ASN.1 parse DER ECDSA Sign', async (t) => {
  const signature = decodeBase64Url(
    'MEQCIDzvJw-L8UjQd6axnXhdaF9pI-RvYyyWWwRs0fK8wMm1AiA8Zvm6VJrw5Ta6HaYOR5V9gn9RFUKuzB1IGXTEBx_GNw',
  )
  const res = parseDerEcdsaSign(signature)

  // deno-fmt-ignore
  expect(res).toEqual(new Uint8Array([
    60, 239, 39, 15, 139, 241, 72, 208, 119, 166, 177,
    157, 120, 93, 104, 95, 105, 35, 228, 111, 99, 44,
    150, 91, 4, 108, 209, 242, 188, 192, 201, 181, 60,
    102, 249, 186, 84, 154, 240, 229, 54, 186, 29, 166,
    14, 71, 149, 125, 130, 127, 81, 21, 66, 174, 204,
    29, 72, 25, 116, 196, 7, 31, 198, 55
  ]))
})
