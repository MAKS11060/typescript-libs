/**
 * Configuration options for the {@linkcode printBuf} function.
 */
export interface PrintBufOptions {
  /**
   * The number of bytes to display per line.
   * @default 16
   */
  bytesPerLine?: number

  /**
   * The format to use for displaying the byte number.
   * @default 'dec'
   */
  byteNumberFormat?: 'hex' | 'dec' // | 'bin'

  /**
   * The format to use for displaying the byte.
   * @default 'dec'
   */
  byteFormat?: 'hex' | 'dec' | 'bin'

  /**
   * The format to use for displaying the address.
   * @default 'hex'
   */
  addressFormat?: 'hex' | 'dec'

  /**
   * The maximum number of rows to display. If set to `0`, all rows will be displayed.
   * @default 0
   */
  rowLimit?: number
}

const defaultOptions: Required<PrintBufOptions> = {
  bytesPerLine: Math.max(16),
  byteNumberFormat: 'dec',
  byteFormat: 'hex',
  addressFormat: 'hex',
  rowLimit: 0,
}

const formats = {hex: 16, dec: 10, bin: 2}
const formatsPrintSize = {hex: 2, dec: 3, bin: 8}

/**
 * Prints the contents of an {@linkcode ArrayBuffer} in a formatted table to the console.
 *
 * @param buffer The buffer to print.
 * @param options Configuration options for the {@linkcode printBuf} function.
 *
 * @example
 * ```ts
 * printBuf(crypto.getRandomValues(new Uint8Array(40)))
 *
 * //       40 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15
 * // 00000000 b3 45 cf 2b 90 b3 97 15 79 05 d3 36 d9 bd 3f b7
 * // 00000010 18 1e ff 65 d5 b8 04 4d 72 1b 51 94 3d 78 7b 6b
 * // 00000020 cd 5a b3 2b 47 59 53 e6
 * ```
 */
export const printBuf = (buffer: Uint8Array, options?: PrintBufOptions) => {
  const cfg: Required<PrintBufOptions> = {
    ...defaultOptions,
    ...options,
  }
  const buf = new Uint8Array(buffer)

  let counter = 0
  let output = ''
  let outputCss: string[] = []
  let row = 0

  // Print column numbers
  for (let i = 0; i < cfg.bytesPerLine; i++) {
    const col = i.toString(formats[cfg.byteNumberFormat])
    const colWithPad = col.padStart(formatsPrintSize[cfg.byteFormat], '0')
    // 000 001 => %c00 + %c1
    output += `%c${
      colWithPad.slice(
        0,
        colWithPad.length - col.length,
      )
    }%c${col} `
    outputCss.push('color: black', 'color: white')
  }

  // Print size + col numbers
  output = `%c${buf.byteLength.toString().padStart(8, ' ')} ${output}`

  console.log(output, 'color: orange', ...outputCss)
  output = ''

  if (!buf.byteLength) {
    console.log(`         %c<Empty>`, 'color: gray')
    return
  }

  for (let i = 0; i < buf.length; i++) {
    outputCss = row % 2 ? ['color: blue', 'color: yellow'] : ['color: blue', 'color: orange']

    // address
    if (counter === 0) {
      output += `%c${
        i
          .toString(formats[cfg.addressFormat])
          .padStart(8, '0')
      } %c`
    }

    // byte
    output += `${
      buf[i]
        .toString(formats[cfg.byteFormat])
        .padStart(formatsPrintSize[cfg.byteFormat], '0')
    } `
    counter++

    // print line
    if (counter === cfg.bytesPerLine) {
      console.log(output, ...outputCss)
      output = ''
      counter = 0
      row++
    }

    if (cfg.rowLimit && cfg.rowLimit <= row) {
      break
    }
  }

  // print last line
  if (output !== '') {
    console.log(output, ...outputCss)
  }
}

/**
 * Updates the default options for the {@linkcode printBuf} function.
 *
 * @param config The new default options for the {@linkcode printBuf} function.
 */
export const setPrintBufConfig = (config: PrintBufOptions) => {
  Object.assign(defaultOptions, config)
}
