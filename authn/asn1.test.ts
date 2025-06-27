import { decodeBase64Url } from '@std/encoding/base64url'
import { encodeHex } from '@std/encoding/hex'
import { expect } from 'jsr:@std/expect/expect'
import { asn1Parse } from './asn1.ts'

Deno.test('ASN.1 parse ECDSA', async (t) => {
  const signature = decodeBase64Url(
    'MEQCIDzvJw-L8UjQd6axnXhdaF9pI-RvYyyWWwRs0fK8wMm1AiA8Zvm6VJrw5Ta6HaYOR5V9gn9RFUKuzB1IGXTEBx_GNw',
  )

  // console.log(asn1Parse(signature))
  console.log(encodeHex(signature))

  // deno-fmt-ignore
  expect(asn1Parse(signature)).toEqual(new Uint8Array([
    60, 239, 39, 15, 139, 241, 72, 208, 119, 166, 177,
    157, 120, 93, 104, 95, 105, 35, 228, 111, 99, 44,
    150, 91, 4, 108, 209, 242, 188, 192, 201, 181, 60,
    102, 249, 186, 84, 154, 240, 229, 54, 186, 29, 166,
    14, 71, 149, 125, 130, 127, 81, 21, 66, 174, 204,
    29, 72, 25, 116, 196, 7, 31, 198, 55
  ]))
})
