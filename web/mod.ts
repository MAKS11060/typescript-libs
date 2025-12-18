/**
 * Useful wrappers around the {@link https://developer.mozilla.org/docs/Web/API Web Api}.
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
 * const res = await cachedFetch('https://example.com')
 * ```
 * @module
 */

export * from './cache.ts'
export * from './types.ts'

export * from './broadcast-channel.ts'
export * from './url-pattern.ts'
