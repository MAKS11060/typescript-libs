/**
 * @example
 * ```ts
 * printBuf(crypto.getRandomValues(new Uint8Array(40)))
 *
 * // Bytes 40
 * // 00000000 b3 45 cf 2b 90 b3 97 15 79 05 d3 36 d9 bd 3f b7
 * // 00000010 18 1e ff 65 d5 b8 04 4d 72 1b 51 94 3d 78 7b 6b
 * // 00000020 cd 5a b3 2b 47 59 53 e6
 * ```
 */
export const printBuf = (buffer: ArrayBuffer, bytesPerLine: number = 16) => {
  const buf = new Uint8Array(buffer)
  const css = ['color: blue', 'color: orange']

  console.log(`%cBytes %c${buf.byteLength}`, 'color: blue', 'color: orange')
  let counter = 0
  let output = ''
  for (let i = 0; i < buf.length; i++) {
    if (counter === 0) {
      output += `%c${i.toString(16).padStart(8, '0')} %c`
    }

    output += `${buf[i].toString(16).padStart(2, '0')} `
    counter++

    if (counter === bytesPerLine) {
      console.log(output, ...css)
      output = ''
      counter = 0
    }
  }

  if (output !== '') {
    console.log(output, ...css)
  }
}
