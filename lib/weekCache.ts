/**
 * Uses the first argument to cache the result
 *
 * @example
 * const authHook = useWeakCache((headers: Headers) => {
 *   if (headers.get('authorization') == 'Bearer test') return true
 * })
 * const headers = new Headers({'Authorization': 'Bearer test'})
 *
 * const ctx = {} // any object
 * console.log(await authHook(ctx, headers))
 * console.log(await authHook(ctx, headers)) // from cache
 */
export const useWeekCache = <T extends unknown[], R>(
  cb: (...args: T) => R
): ((
  key: WeakKey,
  ...args: T
) => R extends PromiseConstructor ? Promise<R> : R) => {
  const cache = new WeakMap<WeakKey, R>()

  if (cb.constructor.name === 'AsyncFunction') {
    return (async (key: WeakKey, ...args: T): Promise<R> => {
      if (!cache.has(key)) {
        cache.set(key, await cb.apply(null, args))
      }
      return cache.get(key)!
      // deno-lint-ignore no-explicit-any
    }) as any
  } else {
    return ((key: WeakKey, ...args: T): R => {
      if (!cache.has(key)) {
        cache.set(key, cb.apply(null, args))
      }
      return cache.get(key)!
      // deno-lint-ignore no-explicit-any
    }) as any
  }
}
