#!/usr/bin/env -S deno run -A --watch

import { printBuf } from './printBuf.ts'

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

const buf = crypto.getRandomValues(new Uint8Array(32))
printBuf(buf)

printBuf(buf, {
  addressFormat: 'dec',
  byteFormat: 'dec',
  bytesPerLine: 12,
})

printBuf(buf, {
  addressFormat: 'hex',
  byteNumberFormat: 'hex',
  bytesPerLine: 12,
})

printBuf(buf, {
  addressFormat: 'hex',
  byteNumberFormat: 'hex',
  byteFormat: 'bin',
  bytesPerLine: 4,
})
