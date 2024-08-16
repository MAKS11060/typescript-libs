/**
 * Configuration options for the {@linkcode printBuf} function.
 */
export interface PrintBufOptions {
  /**
   * The number of bytes to display per line.
   * @type {number}
   * @default 16
   */
  bytesPerLine?: number

  /**
   * The format to use for displaying the byte number.
   * @type {'hex' | 'dec'}
   * @default 'dec'
   */
  byteNumberFormat?: 'hex' | 'dec'

  /**
   * The format to use for displaying the address.
   * @type {'hex' | 'dec'}
   * @default 'hex'
   */
  addressFormat?: 'hex' | 'dec'

  /**
   * The maximum number of rows to display. If set to `0`, all rows will be displayed.
   * @type {number}
   * @default 0
   */
  rowLimit?: number
}

const defaultOptions: Required<PrintBufOptions> = {
  bytesPerLine: 16,
  byteNumberFormat: 'dec',
  addressFormat: 'hex',
  rowLimit: 0,
}

/**
 * Prints the contents of an {@linkcode ArrayBuffer} in a formatted table to the console.
 *
 * @param {ArrayBuffer} buffer - The buffer to print.
 * @param {PrintBufOptions} [options] - Configuration options for the {@linkcode printBuf} function.
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
export const printBuf = (buffer: ArrayBuffer, options?: PrintBufOptions) => {
  const cfg: Required<PrintBufOptions> = {
    ...defaultOptions,
    ...options,
  }
  const buf = new Uint8Array(buffer)
  const css = ['color: blue', 'color: orange']

  let counter = 0
  let output = ''
  let row = 0

  // Print column numbers
  for (let i = 0; i < cfg.bytesPerLine; i++) {
    output += `${i
      .toString(cfg.byteNumberFormat === 'hex' ? 16 : 10)
      .padStart(2, '0')} `
  }

  // Print size + col num
  console.log(
    `%c${buf.byteLength.toString().padStart(8, ' ')} %c${output}`,
    'color: orange',
    'color: black'
  )
  output = ''

  for (let i = 0; i < buf.length; i++) {
    if (counter === 0) {
      output += `%c${i
        .toString(cfg.addressFormat === 'hex' ? 16 : 10)
        .padStart(8, '0')} %c`
    }

    output += `${buf[i].toString(16).padStart(2, '0')} `
    counter++

    if (counter === cfg.bytesPerLine) {
      console.log(output, ...css)
      output = ''
      counter = 0
      row++
    }

    if (cfg.rowLimit && cfg.rowLimit <= row) {
      break
    }
  }

  if (output !== '') {
    console.log(output, ...css)
  }
}

/**
 * Updates the default options for the {@linkcode printBuf} function.
 *
 * @param {PrintBufOptions} config - The new default options for the {@linkcode printBuf} function.
 */
export const setPrintBufConfig = (config: PrintBufOptions) => {
  Object.assign(defaultOptions, config)
}
