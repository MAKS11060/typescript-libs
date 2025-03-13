import {ExternalDocumentationObject} from 'openapi3-ts/oas31'

// '/api/{version}' => 'version'
export type ParsePath<T extends string> = T extends `${string}{${infer P}}${infer Rest}` ? P | ParsePath<Rest> : never

// '/api/{version}' => ['version']
export const extractParams = (path: string) => Array.from(path.matchAll(/\{([^}]+)\}/g), (match) => match[1])

type MergeObjects<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A & keyof B
    ? A[K] & B[K]
    : K extends keyof A
    ? A[K]
    : K extends keyof B
    ? B[K]
    : never
}

type MergeArray<T extends Array<any>> = T extends [infer First, ...infer Rest]
  ? First extends object
    ? Rest extends Array<any>
      ? MergeObjects<First, MergeArray<Rest>>
      : First
    : {}
  : {}

export const mergeTags = <
  T extends Array<Record<string, {description?: string; externalDocs?: ExternalDocumentationObject}>>
>(
  ...tagsArray: T
): MergeArray<T> => {
  return tagsArray.reduce((acc, curr) => {
    return {...acc, ...curr}
  }, {} as any)
}
