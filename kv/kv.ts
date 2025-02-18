import type {StandardSchemaV1} from '@standard-schema/spec'
import {kvMap, kvSet} from './kv_base.ts'
import {type ModelOptions, kvModel} from './kv_model.ts'

/**
 * @example
 * import {kvProvider} from '@maks11060/kv'
 *
 * const kv = await Deno.openKv()
 * const kvLib = kvProvider(kv)
 */
export const kvProvider = (kv: Deno.Kv) => {
  return {
    /**
     * @example
     * import {z} from 'zod'
     * import {kvProvider} from '@maks11060/kv'
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
     */
    model: <
      Schema extends StandardSchemaV1, //
      Options extends ModelOptions<Schema, string>
    >(
      schema: Schema,
      modelOptions: Options
    ) => {
      return kvModel<Schema, Options>(kv, schema, modelOptions)
    },

    /**
     * @example
     * import {kvProvider} from '@maks11060/kv'
     *
     * const kv = await Deno.openKv()
     * const kvLib = kvProvider(kv)
     *
     * const kvMap = kvLib.map('map1')
     *
     * await kvMap.set('1', 'a')
     * await kvMap.set('2', 'b')
     * await kvMap.has('1') // true
     * await kvMap.get('1') // 'a'
     *
     * console.log(await kvMap.keys()) // [ "1", "2" ]
     * console.log(await kvMap.values()) // [ "a", "b" ]
     * console.log(await kvMap.entries()) // [ [ "1", "a" ], [ "2", "b" ] ]
     *
     * for await (const [key, val] of kvMap) {
     *   console.log({key, val})
     * }
     */
    map: <K extends Deno.KvKeyPart, V>(prefix: Deno.KvKeyPart) => {
      return kvMap<K, V>(kv, prefix)
    },

    /**
     * @example
     * import {kvProvider} from '@maks11060/kv'
     *
     * const kv = await Deno.openKv()
     * const kvLib = kvProvider(kv)
     *
     * const kvSet = kvLib.set('set1')
     *
     * await kvSet.add('1')
     * await kvSet.add('2')
     * await kvSet.has('1') // true
     *
     * console.log(await kvSet.keys()) // [ "1", "2" ]
     * console.log(await kvSet.values()) // [ "1", "2" ]
     * console.log(await kvSet.entries()) // [ [ "1", "1" ], [ "2", "2" ] ]
     *
     * for await (const val of kvSet) {
     *   console.log({val})
     * }
     */
    set: <T extends Deno.KvKeyPart>(prefix: Deno.KvKeyPart) => {
      return kvSet<T>(kv, prefix)
    },
  }
}
