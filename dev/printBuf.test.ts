#!/usr/bin/env -S deno run -A --watch

import {$} from 'jsr:@david/dax'
import {concat} from 'jsr:@std/bytes'

const buf = concat([
  new Uint8Array(64),
  crypto.getRandomValues(new Uint8Array(64)),
])

interface XxdOptions {
  /**
   * format <cols> octets per line.
   * @default 16 */
  c: number

  /**
   * number of octets per group in normal output.
   * @Default 2
   */
  g: number
}
const xxd = async (options: Partial<XxdOptions>, data: Uint8Array<ArrayBuffer>) => {
  const args = Object.entries(options).map(([key, value]) => `-${key} ${value}`).join(' ')
  if (args.length)  await $`xxd ${args} < ${buf}`
  else await $`xxd < ${buf}`
}

await xxd({}, buf)

// printBuf(new Uint8Array(0))
// printBuf(new Uint8Array(1))
// printBuf(new Uint8Array(16))
// printBuf(new Uint8Array(127))

// setPrintBufConfig({
//   bytesPerLine: 16,
//   addressFormat: 'dec',
//   byteNumberFormat: 'dec',
//   rowLimit: 4,
// })

// printBuf(buf)

// printBuf(buf, {
//   addressFormat: 'dec',
//   byteFormat: 'dec',
//   bytesPerLine: 12,
// })

// printBuf(buf, {
//   addressFormat: 'hex',
//   byteNumberFormat: 'hex',
//   bytesPerLine: 12,
// })

// printBuf(buf, {
//   addressFormat: 'hex',
//   byteNumberFormat: 'hex',
//   byteFormat: 'bin',
//   bytesPerLine: 4,
// })
