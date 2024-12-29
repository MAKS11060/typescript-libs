export type CacheOptions = {
  /** `cacheName` */
  name: string
  /** @default false */
  log?: boolean
  /** `Seconds` */
  ttl?: number
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
      const cacheControl = matches.headers.get('Cache-Control')
      if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
        if (maxAgeMatch) {
          const maxAge = parseInt(maxAgeMatch[1], 10)
          const cachedTime = Date.parse(matches.headers.get('Date') || '')
          if (!isNaN(cachedTime) && Date.now() - cachedTime < maxAge * 1000) {
            if (options.log) console.log('[cache] matched', matches.url)
            return matches
          }
        }
      }

      // delete expired
      cache.delete(reqInit).then((v) => {
        if (options.log && v) console.log('[cache] delete', reqInit.url, reqInit)
      })
    }

    // direct
    const res = await fetch(reqInit, reqInit)
    if (res.ok) {
      const resClone = res.clone()
      const responseToCache = new Response(resClone.body, resClone)
      responseToCache.headers.set('Cache-Control', `max-age=${CACHE_TTL}`)
      await cache.put(reqInit, responseToCache)
      if (options.log) console.log('[cache] put', res.status, reqInit.url)
    }

    return res
  }
}
