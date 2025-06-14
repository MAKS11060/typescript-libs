import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

/**
 * Modify the `Variables` in `hono` context
 *
 * @example
 * ```ts
 * const hook = createHonoVar(async (c) => {
 *   return {
 *     data: 'text',
 *     foo(data: string) {
 *       console.log(data)
 *       return data
 *     }
 *   }
 * })
 *
 * const app = new Hono()
 *   .get('/test', hook, (c) => {
 *     return c.text(c.var.foo('hello'))
 *   })
 * ```
 */
export const createHonoVar = <const R extends Record<string, unknown>>(handler: (c: Context) => Promise<R> | R) => {
  const cache = new WeakMap()

  if (handler.constructor.name === 'AsyncFunction') {
    return createMiddleware<{Variables: Awaited<R>}>(async (c, next) => {
      if (cache.has(c)) return await next() // per request

      const res = (await handler(c)) as Awaited<R>
      cache.set(c, res) // cache result

      for (const key in res) {
        c.set(key, res[key])
      }

      await next()
    })
  } else {
    return createMiddleware<{Variables: R}>(async (c, next) => {
      if (cache.has(c)) return await next() // per request

      const res = handler(c) as Awaited<R>
      cache.set(c, res) // cache result

      for (const key in res) {
        c.set(key, res[key])
      }

      await next()
    })
  }
}
