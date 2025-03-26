// '/api/{version}' => 'version'
export type ParsePath<T extends string> = T extends `${string}{${infer P}}${infer Rest}` ? P | ParsePath<Rest> : never


// '/api/{version}' => ['version']
export const extractParams = (path: string) => Array.from(path.matchAll(/\{([^}]+)\}/g), (m) => m[1])
