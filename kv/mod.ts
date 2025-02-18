/**
 * @module
 *
 * Useful utilities for Deno KV
 *
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
 *   age: z.number().default(18),
 *   role: z.array(z.string()),
 * })
 *
 * const userModel = kvLib.model(userSchema, {
 *   prefix: 'user',
 *   primaryKey: 'id',
 *   index: {
 *     username: {key: (user) => user.username.toLowerCase()},
 *     age: {relation: 'many', key: (user) => user.age},
 *     role: {relation: 'many', key: (user) => user.role},
 *   },
 * })
 * ```
 */

export * from './kv.ts'
export * from './kv_base.ts'
export * from './kv_helper.ts'
export * from './kv_model.ts'
