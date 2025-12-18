import type {Context, MiddlewareHandler} from 'hono'
import {createMiddleware} from 'hono/factory'

type GetVariables<T extends MiddlewareHandler> = T extends MiddlewareHandler<infer V>
  ? V extends {Variables: infer Var} ? Var
  : {}
  : {}

type MergeVariables<T extends MiddlewareHandler[]> = T extends [] ? {}
  : T extends [infer Head, ...infer Rest]
    ? Head extends MiddlewareHandler ? Rest extends MiddlewareHandler[] ? GetVariables<Head> & MergeVariables<Rest>
      : GetVariables<Head>
    : {}
  : {}

type CreateHonoVar = {
  // no deps
  <T extends Record<string, (c: Context, ...args: any[]) => any>>(
    options: T | (() => T),
  ): MiddlewareHandler<{
    Variables: {
      [K in keyof T]: T[K] extends (c: Context, ...args: infer Args) => infer Res ? (...args: Args) => Res
        : never
    }
  }>

  // with deps
  <
    Deps extends MiddlewareHandler[],
    T extends Record<string, (c: Context<{Variables: MergeVariables<Deps>}>, ...args: any[]) => any>,
  >(
    ...args: [...deps: Deps, options: T | (() => T)]
  ): MiddlewareHandler<{
    Variables:
      // & MergeVariables<Deps>
      {
        [K in keyof T]: T[K] extends (c: Context, ...args: infer Args) => infer Res ? (...args: Args) => Res
          : never
      }
  }>
}

export const createHonoVar: CreateHonoVar = (...args: any[]) => {
  let dependencies: MiddlewareHandler[] = []
  let options = args[args.length - 1]

  if (args.length > 1) {
    dependencies = args.slice(0, -1)
  }

  options = typeof options === 'function' ? options() : options

  const cache = new WeakMap()

  return createMiddleware(async (c, next) => {
    // apply deps
    for (const dep of dependencies) {
      await dep(c, async () => {})
    }

    if (cache.has(c)) {
      return await next()
    }

    for (const key in options) {
      const fn = options[key].bind(null, c)
      c.set(key, fn)
      cache.set(c, fn)
    }

    await next()
  })
}

/* // ver 1
type MergeVariables<T extends MiddlewareHandler[]> = {
  [K in T[number] as K extends MiddlewareHandler<infer V> ? keyof V['Variables'] : never]: K extends MiddlewareHandler<infer V>
    ? V['Variables'][keyof V['Variables']]
    : never
}

type CreateHonoVar = {
  <T extends Record<string, (c: Context, ...args: any[]) => any>>(
    options: T | (() => T)
  ): MiddlewareHandler<{
    Variables: {
      [K in keyof T]: T[K] extends (c: Context, ...args: infer Args) => infer Res
        ? (...args: Args) => Res
        : never
    }
  }>

  <Deps extends MiddlewareHandler[], T extends Record<string, (c: Context<{Variables: MergeVariables<Deps>}>, ...args: any[]) => any>>(
    ...args: [...deps: Deps, options: T | (() => T)]
  ): MiddlewareHandler<{
    Variables: MergeVariables<Deps> & {
      [K in keyof T]: T[K] extends (c: Context, ...args: infer Args) => infer Res
        ? (...args: Args) => Res
        : never
    }
  }>
}
 */

/* import type { Context, MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'

type CreateHonoVar = {
  <const T extends {[K: string]: (c: Context, ...props: any[]) => unknown}>(options: T): MiddlewareHandler<
    {
      Variables: {
        [K in keyof T]: T[K] extends (c: Context, ...args: infer Arg) => infer Res ? (...args: Arg) => Res : never
      }
    },
    string,
    {}
  >
  <const T extends {[K: string]: (c: Context, ...props: any[]) => unknown}>(options: () => T): MiddlewareHandler<
    {
      Variables: {
        [K in keyof T]: T[K] extends (c: Context, ...args: infer Arg) => infer Res ? (...args: Arg) => Res : never
      }
    },
    string,
    {}
  >
}

export const createHonoVar: CreateHonoVar = (options) => {
  options = typeof options === 'function' ? options() : options

  const cache = new WeakMap()

  return createMiddleware(async (c, next) => {
    if (cache.has(c)) return await next() // per request

    for (const key in options) {
      const fn = options[key].bind(options, c) as any
      cache.set(c, fn)
      c.set(key, fn)
    }

    await next()
  })
} */

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
// export const createHonoVar = <
//   const R extends Record<string, unknown>,
// >(handler: (c: Context) => Promise<R> | R) => {
//   const cache = new WeakMap()

//   if (handler.constructor.name === 'AsyncFunction') {
//     return createMiddleware<{Variables: Awaited<R>}>(async (c, next) => {
//       if (cache.has(c)) return await next() // per request

//       const res = (await handler(c)) as Awaited<R>
//       cache.set(c, res) // cache result

//       for (const key in res) {
//         c.set(key, res[key])
//       }

//       await next()
//     })
//   } else {
//     return createMiddleware<{Variables: R}>(async (c, next) => {
//       if (cache.has(c)) return await next() // per request

//       const res = handler(c) as Awaited<R>
//       cache.set(c, res) // cache result

//       for (const key in res) {
//         c.set(key, res[key])
//       }

//       await next()
//     })
//   }
// }

/* export const createHonoVar = <
  const T extends {
    [K: string]: (c: Context, ...props: any[]) => unknown
  },
>(options: T | (() => T)) => {
  const cache = new WeakMap()

  options = typeof options === 'function' ? options() : options

  return createMiddleware<{
    Variables: {
      [K in keyof T]: T[K] extends (c: Context, ...args: infer Arg) => infer Res ? (...args: Arg) => Res : never
    }
  }>(async (c, next) => {
    if (cache.has(c)) return await next() // per request

    for (const key in options) {
      const fn = options[key].bind(options, c) as any
      cache.set(c, fn)
      c.set(key, fn)
    }

    await next()
  })
} */
