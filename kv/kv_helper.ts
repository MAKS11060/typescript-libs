export type KvPageOptions<Offset = Deno.KvKeyPart> = {
  offset?: Offset
  /** @default 50 */
  limit?: number
} & Omit<Deno.KvListOptions, 'cursor'>

/**
 * @example
 * const kv = await Deno.openKv(':memory:')
 *
 * await kv.set(['post', 1], '1')
 *
 * const kvPage = await getKvPage(kv, ['post'], {})
 * console.log(await kvPage.entries()) // [ [[ "post", 1 ], "1" ] ]
 */
export const getKvPage = async <T, Offset = Deno.KvKeyPart>(
  kv: Deno.Kv,
  key: Deno.KvKey,
  options: KvPageOptions<Offset> = {}
): Promise<{
  kvEntries(): Promise<Deno.KvEntry<T>[]>
  entries(): Promise<[Deno.KvKey, T][]>
  values(): Promise<T[]>
  keys(): Promise<Deno.KvKey[]>
}> => {
  const isOffset = options?.offset !== undefined
  options.limit ??= 50

  if (!options.reverse && isOffset) options.limit += 1 // + 1 end element
  if (options.limit === 0) delete options.limit

  const iter = isOffset //
    ? kv.list<T>({prefix: key, [options.reverse ? 'end' : 'start']: [...key, options.offset]}, options)
    : kv.list<T>({prefix: key}, options)

  if (!options.reverse && isOffset) await iter.next()

  return {
    kvEntries(): Promise<Deno.KvEntry<T>[]> {
      return Array.fromAsync(iter)
    },
    entries(): Promise<[Deno.KvKey, T][]> {
      return Array.fromAsync(iter, (v) => [v.key, v.value])
    },
    values(): Promise<T[]> {
      return Array.fromAsync(iter, (v) => v.value)
    },
    keys(): Promise<Deno.KvKey[]> {
      return Array.fromAsync(iter, (v) => v.key)
    },
  }
}

/**
 * Creates an array from {@linkcode Deno.KvListIterator}
 *
 * @example
 * ```ts
 * const iter = kv.list<{}>({prefix: ['Key']})
 *
 * const items = await fromKvIterator(iter, {limit: 10})
 * items[0].value // {}
 * ```
 */
export const fromKvIterator = async <T>(
  iter: Deno.KvListIterator<T>,
  options?: {
    limit?: number
    filter?: (val: T, key: Deno.KvKey) => unknown
  }
): Promise<Deno.KvEntry<T>[]> => {
  const result: Deno.KvEntry<T>[] = []

  for await (const item of iter) {
    if (options?.filter && !options.filter(item.value, item.key)) continue
    result.push(item)
    if (options?.limit && options.limit <= result.length) break
  }

  return result
}

/**
 * Wipe KV
 */
export const dropKV = async (kv: Deno.Kv): Promise<void> => {
  for await (const item of kv.list({prefix: []})) {
    await kv.delete(item.key)
  }
}

/**
 * Print KV data
 */
export const printKV = async (kv: Deno.Kv, key: Deno.KvKey = []): Promise<void> => {
  for await (const item of kv.list({prefix: key})) {
    console.log(item.key, item.value)
  }
}
