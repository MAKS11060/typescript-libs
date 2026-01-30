import type {BaseOptions} from '../types.ts'

// deno-fmt-ignore
export const config: Partial<BaseOptions> = {
  base: 'https://hdrezka.me',
  userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
}

/** Set global config */
export const setConfig = (options: BaseOptions) => {
  Object.assign(config, options)
}
