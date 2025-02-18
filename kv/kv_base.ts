/**
 * @module
 *
 * kvMap
 * kvSet
 */

/**
 * KvMap interface
 */
export interface KvMap<K extends Deno.KvKeyPart, V> {
  set(key: K, value: V, options?: {expireIn?: number}): Promise<boolean>
  get(key: K): Promise<V | null>
  has(key: K): Promise<boolean>
  clear(): Promise<void>
  delete(key: K): Promise<boolean>
  entries(options?: {limit?: number; reverse?: boolean}): Promise<[K, V][]>
  keys(options?: {limit?: number; reverse?: boolean}): Promise<K[]>
  values(options?: {limit?: number; reverse?: boolean}): Promise<V[]>
  [Symbol.asyncIterator](): AsyncIterator<[K, V]>
}

/**
 * A simple implementation of the {@linkcode Map} structure
 *
 * @example
 * ```ts
 * import {kvMap} from '@maks11060/kv'
 *
 * const kv = await Deno.openKv()
 * const kvMap = kvMap(kv, 'map1')
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
 * ```
 */
export const kvMap = <K extends Deno.KvKeyPart, V>(kv: Deno.Kv, prefix: Deno.KvKeyPart): KvMap<K, V> => {
  return {
    async set(key: K, value: V, options?: {expireIn?: number}): Promise<boolean> {
      const res = await kv.set([prefix, key], value, options)
      return res.ok
    },

    async get(key: K): Promise<V | null> {
      const res = await kv.get<V>([prefix, key])
      return res.value
    },

    async has(key: K): Promise<boolean> {
      const res = await kv.get<V>([prefix, key])
      return Boolean(res.versionstamp)
    },

    async clear(): Promise<void> {
      const iter = kv.list({prefix: [prefix]})
      for await (const item of iter) {
        await kv.delete(item.key)
      }
    },

    async delete(key: K): Promise<boolean> {
      await kv.delete([prefix, key])
      return true
    },

    entries(options?: {limit?: number; reverse?: boolean}): Promise<[K, V][]> {
      const iter = kv.list<V>({prefix: [prefix]}, options)
      return Array.fromAsync(iter, (item) => [item.key[1] as K, item.value])
    },

    keys(options?: {limit?: number; reverse?: boolean}): Promise<K[]> {
      const iter = kv.list<V>({prefix: [prefix]}, options)
      return Array.fromAsync(iter, (item) => item.key[1] as K)
    },

    values(options?: {limit?: number; reverse?: boolean}): Promise<V[]> {
      const iter = kv.list<V>({prefix: [prefix]}, options)
      return Array.fromAsync(iter, (item) => item.value)
    },

    async *[Symbol.asyncIterator](): AsyncIterator<[K, V]> {
      const iter = kv.list<V>({prefix: [prefix]})
      for await (const item of iter) {
        yield [item.key[1] as K, item.value]
      }
    },
  }
}

/**
 * KvSet interface
 */
export interface KvSet<T extends Deno.KvKeyPart> {
  add(value: T, options?: {expireIn?: number}): Promise<boolean>
  has(value: T): Promise<boolean>
  clear(): Promise<void>
  delete(value: T): Promise<boolean>
  entries(options?: {limit?: number; reverse?: boolean}): Promise<[T, T][]>
  keys(options?: {limit?: number; reverse?: boolean}): Promise<T[]>
  values(options?: {limit?: number; reverse?: boolean}): Promise<T[]>
  [Symbol.asyncIterator](): AsyncIterator<T>
}

/**
 * A simple implementation of the {@linkcode Set} structure
 *
 * @example
 * ```ts
 * import {kvSet} from '@maks11060/kv'
 *
 * const kv = await Deno.openKv()
 * const kvSet = kvSet(kv, 'set1')
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
 * ```
 */
export const kvSet = <T extends Deno.KvKeyPart>(kv: Deno.Kv, prefix: Deno.KvKeyPart): KvSet<T> => {
  return {
    async add(value: T, options?: {expireIn?: number}): Promise<boolean> {
      const res = await kv.set([prefix, value], null, options)
      return res.ok
    },

    async has(value: T): Promise<boolean> {
      const res = await kv.get([prefix, value])
      return Boolean(res.versionstamp)
    },

    async clear(): Promise<void> {
      const iter = kv.list({prefix: [prefix]})
      for await (const item of iter) {
        await kv.delete(item.key)
      }
    },

    async delete(value: T): Promise<boolean> {
      await kv.delete([prefix, value])
      return true
    },

    entries(options?: {limit?: number; reverse?: boolean}): Promise<[T, T][]> {
      const iter = kv.list({prefix: [prefix]}, options)
      return Array.fromAsync(iter, (item) => [item.key[1] as T, item.key[1] as T])
    },

    keys(options?: {limit?: number; reverse?: boolean}): Promise<T[]> {
      const iter = kv.list({prefix: [prefix]}, options)
      return Array.fromAsync(iter, (item) => item.key[1] as T)
    },

    values(options?: {limit?: number; reverse?: boolean}): Promise<T[]> {
      const iter = kv.list({prefix: [prefix]}, options)
      return Array.fromAsync(iter, (item) => item.key[1] as T)
    },

    async *[Symbol.asyncIterator](): AsyncIterator<T> {
      const iter = kv.list({prefix: [prefix]})
      for await (const item of iter) {
        yield item.key[1] as T
      }
    },
  }
}
