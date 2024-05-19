import {Context} from 'hono'
import {createMiddleware} from 'hono/factory'

type ReturnTypeEnv<T extends Record<string, unknown>> = {
  Variables: {
    [K in keyof T]: T[K]
  }
}

/**
 * Modify the `Variables` in context
 *
 * @example
 * ```ts
 * const hook = createHook(async (c) => {
 *   return {
 *     ua: c.req.header('user-agent')!
 *   }
 * })
 * new Hono()
 *   .get('/test', hook, (c) => {
 *     return c.text(c.var.ua)
 *   })
 * ```
 */
export const createHook = <R extends Record<string, unknown>>(
  handler: (c: Context) => R | Promise<R>
) => {
  const cache = new WeakMap()

  return createMiddleware<ReturnTypeEnv<Awaited<R>>>(async (c, next) => {
    if (cache.has(c)) return await next() // per request

    const res = await handler(c)
    cache.set(c, res) // cache result

    for (const key in res) {
      c.set(key as keyof typeof handler, res[key] as any)
    }

    await next()
  })
}
