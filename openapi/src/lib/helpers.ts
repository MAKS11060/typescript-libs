// '/api/{version}' => 'version'
export type ParsePath<T extends string> =
  T extends `${string}{${infer P}}${infer Rest}` ? P | ParsePath<Rest> : never

// '/api/{version}' => ['version']
export const extractParams = (path: string) => {
  return Array.from(path.matchAll(/\{([^}]+)\}/g), (m) => m[1])
}

// Map<string, {}> => {}
type EntriesToRecord = {
  <K extends PropertyKey, V>(iter: Iterable<[K, V]>): Record<K, V>
  <K extends PropertyKey, V, R>(
    iter: Iterable<[K, V]>,
    mapper: (value: V, key: K) => R
  ): Record<K, R>
}

export const entriesToRecord: EntriesToRecord = (
  iter: Iterable<[string, any]>,
  mapper?: (value: string, key: string) => unknown
) => {
  const res = {} as any
  for (const [key, val] of iter) {
    res[key] = mapper ? mapper(val, key) : val
  }
  return res
}

export const toRest = <
  // P extends string,
  // Input extends Record<P, unknown>,
  // TKeys extends Partial<Record<keyof Input, boolean | 'nullish'>>
  P extends PropertyKey,
  Input extends {[k in P]: any},
  TKeys extends {[K in keyof Input]?: boolean | 'nullish'}
>(
  obj: Input,
  mask: TKeys
) => {
  if (obj === undefined) return {}
  let res = {} as Partial<Record<keyof TKeys, unknown>>
  for (const key in mask) {
    if (mask[key] === true) {
      if (key in obj) {
        res[key] = (obj as Record<keyof TKeys, unknown>)[key]
      }
    } else if (mask[key] === 'nullish') {
      res[key] = (obj as Record<keyof TKeys, unknown>)[key] ?? null
    }
  }

  return res as {
    [P in keyof TKeys]: P extends keyof Input
      ? TKeys[P] extends true
        ? Input[P]
        : TKeys[P] extends 'nullish'
        ? Input[P] | null
        : never
      : never
  }
}

export const toProp = <K extends PropertyKey, T, R>(
  key: K,
  input: T,
  mapper?: (value: T & {}) => R
): Record<K, R> | {} => {
  if (!input) return {}
  if ((input instanceof Map || input instanceof Map) && !input.size) return {}
  if (Array.isArray(input) && !input.length) return {}

  const output = mapper ? mapper(input) : input
  if (output === undefined) return {}
  if (Array.isArray(output) && !output.length) return {}

  return {[key]: output}
}
