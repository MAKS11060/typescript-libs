// parser
const charCodeToUint = new Uint8Array(104)
for (let i = 0; i < 10; i++) charCodeToUint[48 + i] = i // 0-9
for (let i = 0; i < 6; i++) charCodeToUint[97 + i] = charCodeToUint[65 + i] = 10 + i // a-f A-F

// stringify
const byteToHex: string[] = []

for (let i = 0; i < 256; i++) byteToHex.push(i.toString(16).padStart(2, '0'))

export const parse = (uuid: string) => {
  const bytes = new Uint8Array(16)
  // 00 11 22 33 - 55 66 - 88 99 - aa bb - cc dd ee ff gg hh
  bytes[0] = (charCodeToUint[uuid.charCodeAt(0)] << 4) | charCodeToUint[uuid.charCodeAt(1)]
  bytes[1] = (charCodeToUint[uuid.charCodeAt(2)] << 4) | charCodeToUint[uuid.charCodeAt(3)]
  bytes[2] = (charCodeToUint[uuid.charCodeAt(4)] << 4) | charCodeToUint[uuid.charCodeAt(5)]
  bytes[3] = (charCodeToUint[uuid.charCodeAt(6)] << 4) | charCodeToUint[uuid.charCodeAt(7)]
  // uuid[8]
  bytes[4] = (charCodeToUint[uuid.charCodeAt(9)] << 4) | charCodeToUint[uuid.charCodeAt(10)]
  bytes[5] = (charCodeToUint[uuid.charCodeAt(11)] << 4) | charCodeToUint[uuid.charCodeAt(12)]
  // uuid[13]
  bytes[6] = (charCodeToUint[uuid.charCodeAt(14)] << 4) | charCodeToUint[uuid.charCodeAt(15)]
  bytes[7] = (charCodeToUint[uuid.charCodeAt(16)] << 4) | charCodeToUint[uuid.charCodeAt(17)]
  // uuid[18]
  bytes[8] = (charCodeToUint[uuid.charCodeAt(19)] << 4) | charCodeToUint[uuid.charCodeAt(20)]
  bytes[9] = (charCodeToUint[uuid.charCodeAt(21)] << 4) | charCodeToUint[uuid.charCodeAt(22)]
  // uuid[23]
  bytes[10] = (charCodeToUint[uuid.charCodeAt(24)] << 4) | charCodeToUint[uuid.charCodeAt(25)]
  bytes[11] = (charCodeToUint[uuid.charCodeAt(26)] << 4) | charCodeToUint[uuid.charCodeAt(27)]
  bytes[12] = (charCodeToUint[uuid.charCodeAt(28)] << 4) | charCodeToUint[uuid.charCodeAt(29)]
  bytes[13] = (charCodeToUint[uuid.charCodeAt(30)] << 4) | charCodeToUint[uuid.charCodeAt(31)]
  bytes[14] = (charCodeToUint[uuid.charCodeAt(32)] << 4) | charCodeToUint[uuid.charCodeAt(33)]
  bytes[15] = (charCodeToUint[uuid.charCodeAt(34)] << 4) | charCodeToUint[uuid.charCodeAt(35)]

  return bytes
}

export const stringify = (bytes: Uint8Array<ArrayBuffer>) => {
  if (bytes.byteLength !== 16) throw new Error('The uuid must contain 16 bytes')
  // deno-fmt-ignore
  return (
    byteToHex[bytes[0]] + byteToHex[bytes[1]] +
    byteToHex[bytes[2]] + byteToHex[bytes[3]] + '-' +
    byteToHex[bytes[4]] + byteToHex[bytes[5]] + '-' +
    byteToHex[bytes[6]] + byteToHex[bytes[7]] + '-' +
    byteToHex[bytes[8]] + byteToHex[bytes[9]] + '-' +
    byteToHex[bytes[10]] + byteToHex[bytes[11]] +
    byteToHex[bytes[12]] + byteToHex[bytes[13]] +
    byteToHex[bytes[14]] + byteToHex[bytes[15]]
  )
}

export const UUID = {
  parse,
  stringify,
}
