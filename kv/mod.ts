/**
 * @module
 *
 *  ```ts
 * import {kvProvider} from '@maks11060/kv'
 *
 * const kv = await Deno.openKv()
 * const kvLib = kvProvider(kv)
 *
 *
 *
 * ```
 */

export * from './kv.ts'
export * from './kv_base.ts'
export * from './kv_helper.ts'
export * from './kv_model.ts'
