export const origin = new Set([
  //
  'https://hdrezka.me',
  'https://hdrezka.ag',
])

export const ua =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0'

export type GetURI = {
  /**
   * - hdrezka.me
   * - hdrezka.ag
   * @default 'hdrezka.me'
   */
  host?: string
  skipOriginCheck?: boolean
}

export const getURI = (path: string, options?: GetURI) => {
  const uri = new URL(path, 'https://hdrezka.me')
  if (options?.host) {
    uri.host = options?.host
    if (!options.skipOriginCheck && origin.has(options.host)) {
      throw new Error('Invalid URI Origin', {cause: `URI ${uri.toString()}`})
    }
  }

  return uri
}
