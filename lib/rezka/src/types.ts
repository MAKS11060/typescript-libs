export interface BaseOptions {
  fetch?: typeof fetch
  headers?: HeadersInit

  userAgent?: string

  /** @default 'https://hdrezka.me' */
  base?: string
}
