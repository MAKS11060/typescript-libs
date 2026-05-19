import type {FetchMiddleware} from './fetch.ts'

/**
 * Represents options for configuring a cache system
 */
export interface CacheOptions {
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

const l = {
  inherit: `color: inherit`,
  blue: `color: blue`,
  cyan: `color: cyan`,
  green: `color: green`,
  lime: `color: lime`,
  orange: `color: orange`,
  red: `color: red`,
}

const log = {
  match: () => console.log('%c[cache]%c hit', l.blue, l.lime),
  miss: () => console.log('%c[cache]%c miss', l.blue, l.orange),
  put: () => console.log('%c[cache]%c put', l.blue, l.green),
  delete: () => console.log(`[cache]%c delete`, l.red),
}

/**
 * Middleware for using the {@linkcode Cache} api for `GET` requests
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/caches
 *
 * @param options - Cache options
 * @param filter
 * @returns
 */
export const fetchCache = async (
  options: CacheOptions,
  filter?: (request: Request) => boolean | void,
): Promise<FetchMiddleware> => {
  const ttl = options.ttl ?? 60
  const cache = await caches.open(options.name)
  const isMatch = new WeakSet()

  return {
    // match
    async onRequest({request, ctx}) {
      if (filter && !filter(request)) return
      if (request.method !== 'GET') return

      const matches = await cache.match(request)
      if (matches) {
        const age = matches.headers.get('Age')
        const cacheControl = matches.headers.get('Cache-Control')

        if (age) {
          const isExpired = parseInt(age, 10) > ttl
          if (!isExpired) {
            if (options.log) log.match()

            isMatch.add(ctx)
            return matches
          }
        } else if (cacheControl) {
          const maxAgeMatch = cacheControl.match(/max-age=(\d+)/)
          if (maxAgeMatch) {
            // const maxAge = parseInt(maxAgeMatch[1], 10) * 1000
            const maxAge = ttl * 1000 // use ttl direct
            const cachedTime = Date.parse(matches.headers.get('Date') || '')
            const isExpired = Date.now() - cachedTime > maxAge
            if (!isExpired) {
              if (options.log) log.match()

              isMatch.add(ctx)
              return matches
            }
          }
        }

        // Delete expired cache entry if configured
        if (options.deleteExpired) {
          await cache.delete(request).then((v) => {
            if (v && options.log) log.delete()
          })
        }

        await matches.body?.cancel() // close resource
        if (options.log) log.miss()
      }
    },

    // put
    async onResponse({request, response, ctx}) {
      if (isMatch.has(ctx)) {
        // if (options.log) log.match()
        return
      }

      if (request.method !== 'GET') return
      if (response.ok) {
        const _responseClone = response.clone()
        const responseClone = new Response(_responseClone.body, _responseClone) // make editable

        if (ttl) responseClone.headers.set('Cache-Control', `max-age=${ttl}`)
        // else pass original cache-control
        responseClone.headers.delete('age') // not for response cache

        await cache.put(request, responseClone)
        if (options.log) log.put()
        // return response // success put
      }
    },
  }
}
