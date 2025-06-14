/**
 * A wrapper for {@linkcode fetch} using the {@link https://developer.mozilla.org/docs/Web/API/Cache Web Cache Api}.
 * Works with {@link https://deno.com/deploy Deno Deploy}
 * @module
 */

import type { CustomFetch } from './types.ts'

/**
 * Represents options for configuring a cache system
 */
export interface CacheOptions extends CustomFetch {
  /**
   * The `name` of the cache
   */
  name: string

  /**
   * The maximum time-to-live (TTL) for cached items in seconds
   * @default 60
   */
  ttl?: number

  /**
   * Whether to automatically delete expired cache entries
   * @default false
   */
  deleteExpired?: boolean

  /**
   * Whether to log cache operations to the console
   * @default false
   */
  log?: boolean
}

/**
 * Creates a cached {@linkcode fetch} function that intercepts network requests and serves responses from a cache when possible
 *
 * @param options - Configuration options for the cache
 * @returns A function that can be used as a replacement for the global {@linkcode fetch} function
 *
 * @example
 * ```ts
 * import {createCachedFetch} from '@maks11060/web/cache'
 *
 * const cachedFetch = await createCachedFetch({
 *   name: 'my-cache',
 *   ttl: 60,
 *   log: true,
 * })
 *
 * const response = await cachedFetch('https://example.com')
 * ```
 */
export const createCachedFetch = async (options: CacheOptions): Promise<typeof fetch> => {
  const ttl = options.ttl ?? 60

  const _fetch = options?.fetch ?? fetch
  const cache = await caches.open(options.name)

  /**
   * A wrapper around the fetch function that checks the cache before making a network request
   *
   * @param input - The URL or Request object to fetch
   * @param init - Optional initialization settings for the request
   * @returns A promise that resolves to the fetched Response object
   */
  return async (input: URL | Request | string, init?: RequestInit) => {
    const reqInit = new Request(input, init)
    if (reqInit.method !== 'GET') return _fetch(reqInit)

    const matches = await cache.match(reqInit)
    if (matches) {
      if (options.log) console.log('[cache]%c matches', 'color: green')

      const age = matches.headers.get('Age')
      const cacheControl = matches.headers.get('Cache-Control')

      if (age) {
        const isExpired = parseInt(age, 10) > ttl
        if (!isExpired) {
          if (options.log) console.log('[cache]%c hit', 'color: green')
          return matches
        }
      } else if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
        if (maxAgeMatch) {
          // const maxAge = parseInt(maxAgeMatch[1], 10) * 1000
          // const isExpired = Date.now() - cachedTime > maxAge
          const cachedTime = Date.parse(matches.headers.get('Date') || '')
          const isExpired = Date.now() - cachedTime > ttl * 1000
          if (!isExpired) {
            if (options.log) console.log('[cache]%c hit', 'color: green')
            return matches
          }
        }
      }

      // Delete expired cache entry if configured
      if (options.deleteExpired) {
        /* await */ cache.delete(reqInit).then((v) => {
          if (options.log) console.log(`[cache]%c delete ${v}`, 'color: red')
        })
      }

      if (options.log) console.log('[cache]%c miss', 'color: orange')
    }

    // Fetch from network if no valid cache exists
    const res = await _fetch(reqInit)
    if (res.ok) {
      const resClone = res.clone()
      const responseCopy = new Response(resClone.body, resClone)

      if (ttl) responseCopy.headers.set('Cache-Control', `max-age=${ttl}`)
      // else pass original cache-control
      responseCopy.headers.delete('age') // not for response cache

      await cache.put(reqInit, responseCopy)
      if (options.log) console.log('[cache]%c put', 'color: green')
    }

    return res
  }
}
