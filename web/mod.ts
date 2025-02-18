/**
 * @module
 *
 * @example
 * ```ts
 * import {createCachedFetch} from '@maks11060/web'
 *
 * const cachedFetch = await createCachedFetch({
 *   name: 'my-cache',
 *   ttl: 300,
 *   log: true,
 *   deleteExpired: true,
 * })
 *
 * const res = cachedFetch('https://example.com')
 * ```
 */
export * from './cache.ts'
