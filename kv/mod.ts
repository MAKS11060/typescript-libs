/**
 * Useful utilities for {@linkcode Deno.Kv}
 *
 * @example
 * ```ts
 * import {kvProvider} from '@maks11060/kv'
 * import {z} from 'zod'
 *
 * const kv = await Deno.openKv()
 * const kvLib = kvProvider(kv)
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   username: z.string(),
 *   role: z.array(z.string()),
 * })
 *
 * const userModel = kvLib.model(userSchema, {
 *   prefix: 'user',
 *   primaryKey: 'id',
 *   index: {
 *     username: {
 *       relation: 'one',
 *       key: (user) => user.username.toLowerCase(),
 *     },
 *     role: {
 *       relation: 'many',
 *       key: (user) => user.role,
 *     },
 *   },
 * })
 * ```
 *
 * @example
 * ```ts
 * import {kvMap} from '@maks11060/kv'
 *
 * const kv = await Deno.openKv()
 * const map = kvMap<string, string>(kv, 'map')
 *
 * await map.set('key', 'value')
 * await map.set('abc', 'value')
 *
 * await map.has('key') // true
 *
 * await map.values() // ['abc', 'key']
 * for await (const [key, val] of map) {
 *   console.log(key, val)
 * }
 * ```
 * @module
 */

export * from './kv.ts'
export * from './kv_base.ts'
export * from './kv_helper.ts'
export * from './kv_model.ts'

