export const kvSelect = (key: Deno.KvKey, options: {start?: Deno.KvKey; end?: Deno.KvKey}) => ({
  ...(options?.start && {start: [...key, ...options?.start]}),
  ...(options?.end && {end: [...key, ...options?.end]}),
})

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

export type KvPageOptions<T = string> = {
  limit?: number
  offset?: T
  reverse?: boolean
  batchSize?: number
}

export const getKvPage = async <T, O = string>(kv: Deno.Kv, key: Deno.KvKey, init: KvPageOptions<O>) => {
  const options: Deno.KvListOptions = {limit: init?.limit, reverse: init?.reverse}
  options.limit ??= 50

  if (!options.reverse && init?.offset) options.limit += 1 // + 1 end element

  const iter = init?.offset //
    ? kv.list<T>({prefix: key, [options.reverse ? 'end' : 'start']: [...key, init.offset]}, options)
    : kv.list<T>({prefix: key}, options)

  if (!options.reverse && init?.offset) await iter.next()

  return Array.fromAsync(iter)
  // return Array.fromAsync(iter, v => v.value)
  // const entries = await Array.fromAsync(iter, (v) => [v.key.at(-1), v.value])
  // return Object.fromEntries(entries) as Record<string, T>
}
