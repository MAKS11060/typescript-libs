export interface CacheOptions {
  /**
   * The name of the cache.
   */
  name: string

  /**
   * Whether to log cache operations.
   * @default false
   */
  log?: boolean

  /**
   * Time to live for cached items in seconds.
   * @default 0
   */
  ttl?: number

  /**
   * Whether to force delete expired cache items.
   * @default false
   */
  forceDelete?: boolean
}

export const createCachedFetch = async (options: CacheOptions) => {
  const cache = await caches.open(options.name)
  const CACHE_TTL = options.ttl ?? 0 // 60 * 60 * 24 * 30

  return async (input: URL | Request | string, init?: RequestInit) => {
    const reqInit = new Request(input, init)

    // Check if the request method is GET
    if (reqInit.method !== 'GET') {
      return fetch(reqInit)
    }

    // find in cache
    const matches = await cache.match(reqInit)
    if (matches) {
      const age = matches.headers.get('Age')
      const cacheControl = matches.headers.get('Cache-Control')

      // Check if Age header is present and greater than TTL
      if (age) {
        if (parseInt(age, 10) > CACHE_TTL) {
          if (options.log) console.log('[cache]%c Age header is greater than TTL', 'color: red')
        } else {
          if (options.log) console.log('[cache]%c Age header is within TTL', 'color: green')
          return matches
        }
      } else if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
        if (maxAgeMatch) {
          const maxAge = parseInt(maxAgeMatch[1], 10)
          const cachedTime = Date.parse(matches.headers.get('Date') || '')
          if (!isNaN(cachedTime) && Date.now() - cachedTime < maxAge * 1000) {
            if (options.log) console.log('[cache]%c hit', 'color: green')
            return matches
          } else {
            if (options.log) console.log('[cache]%c expired', 'color: red')
          }
        }
      }

      if (options.log) console.log(`[cache]%c miss`, 'color: orange')
      if (options.forceDelete) {
        // delete expired
        cache.delete(reqInit).then((v) => {
          if (options.log && v) console.log(`[cache]%c delete ${reqInit.url}`, 'color: red')
        })
      }
    }

    // direct
    const res = await fetch(reqInit, reqInit)
    if (res.ok) {
      const resClone = res.clone()
      const responseToCache = new Response(resClone.body, resClone)
      responseToCache.headers.set('Cache-Control', `max-age=${CACHE_TTL}`)
      await cache.put(reqInit, responseToCache)
      if (options.log) console.log(`[cache]%c put ${res.status} ${reqInit.url}`, 'color: green')
    }

    return res
  }
}