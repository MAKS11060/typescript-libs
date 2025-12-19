import type {userAgent} from './config.ts'

export interface BaseOptions {
  fetch?: typeof fetch
  headers?: HeadersInit
  /**
   * {@linkcode  userAgent}
   */
  userAgent?: string
  /**
   * @default 'https://hdrezka.me'
   */
  origin?: string
}
