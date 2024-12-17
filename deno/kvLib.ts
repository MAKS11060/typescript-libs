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