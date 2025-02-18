/**
 * @module
 *
 * Useful utilities for Deno KV
 *
 * @example
 *  ```ts
 * import {kvProvider} from '@maks11060/kv'
 * import {z} from 'zod'
 *
 * const kv = await Deno.openKv()
 * const kvLib = kvProvider(kv)
 *
 * const userSchema = z.object({
 *   id: z.string(),
 *   username: z.string(),
 *   flags: z.array(z.string()),
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
 *       key: (user) => user.flags,
 *     },
 *   },
 * })
 * ```
 */

export * from './kv.ts'
export * from './kv_base.ts'
export * from './kv_helper.ts'
export * from './kv_model.ts'

