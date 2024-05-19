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
export const useWeekCache = <T extends (...args: any) => any>(cb: T) => {
  const cache = new WeakMap<WeakKey, ReturnType<T>>()
  return async (key: WeakKey, ...args: Parameters<T>) => {
    if (!cache.has(key)) cache.set(key, await cb(...(args as unknown[])))
    return cache.get(key)! as ReturnType<T>
  }
}
