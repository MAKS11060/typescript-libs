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
