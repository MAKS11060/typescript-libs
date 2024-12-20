export type KvPageOptions<T = string> = {
  offset?: T
  /** @default 50 */
  limit?: number
} & Omit<Deno.KvListOptions, 'cursor'>

/**
 * @example
 * ```ts
 * await kv.set(['key', 0], '')
 *
 * const kvPage = await getKvPage(kv, ['key'])
 * kvPage // [{key: ["key", 0], value: "", versionstamp: "00000000000000020000"}]
 *
 * Object.fromEntries(kvPage.map((v) => [v.key.at(-1), v.value])) // {'0': ''}
 * ```
 */
export const getKvPage = async <T, O = string>(kv: Deno.Kv, key: Deno.KvKey, options: KvPageOptions<O> = {}) => {
  const isOffset = options?.offset !== undefined

  options.limit ??= 50

  if (!options.reverse && isOffset) options.limit += 1 // + 1 end element
  if (options.limit === 0) delete options.limit

  const iter = isOffset //
    ? kv.list<T>({prefix: key, [options.reverse ? 'end' : 'start']: [...key, options.offset]}, options)
    : kv.list<T>({prefix: key}, options)

  if (!options.reverse && isOffset) await iter.next()

  return Array.fromAsync(iter)
}

/**
 * @example
 * ```ts
 * const iter = kv.list<{}>({prefix: ['Key']})
 * const users = await fromKvIterator(iter, {limit: 10})
 * users[0].value // {}
 * ```
 */
export const fromKvIterator = async <T>(
  iter: Deno.KvListIterator<T>,
  options?: {
    limit?: number
    filter?: (val: T, key: Deno.KvKey) => unknown
  }
) => {
  const result: Deno.KvEntry<T>[] = []

  for await (const item of iter) {
    if (options?.filter && !options.filter(item.value, item.key)) continue
    result.push(item)
    if (options?.limit && options.limit <= result.length) break
  }

  return result
}

/**
 * @example
 * ```ts
 * const res = await kvEntries<{}>(kv, {prefix: []})
 *
 * console.log(res) // {'key key2': 'value'}
 * ```
 */
export const kvEntries = async <T>(kv: Deno.Kv, selector: Deno.KvListSelector, options?: Deno.KvListOptions) => {
  return (await Array.fromAsync(kv.list<T>(selector, options), (item) => [item.key.join(' '), item.value]).then(
    Object.fromEntries
  )) as Record<string, T>
}

export const dropKV = async (kv: Deno.Kv) => {
  for await (const item of kv.list({prefix: []})) {
    await kv.delete(item.key)
  }
}

export const printKV = async (kv: Deno.Kv, key: Deno.KvKey = []) => {
  for await (const item of kv.list({prefix: key})) {
    console.log(item.key, item.value)
  }
}
