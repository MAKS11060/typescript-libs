#!/usr/bin/env -S deno run -A

import {zodToJsonSchema} from 'npm:zod-to-json-schema'
import type {ExternalDocumentationObject, SchemaObject} from 'openapi3-ts/oas31'
import {z} from 'zod'
import {SchemaBuilder} from './openapi-schema.ts'
import {ReferenceObject} from './types/openapi-schema.ts'

// '/api/{version}' => 'version'
export type ParsePath<T extends string> = T extends `${string}{${infer P}}${infer Rest}` ? P | ParsePath<Rest> : never

// '/api/{version}' => ['version']
export const extractParams = (path: string) => Array.from(path.matchAll(/\{([^}]+)\}/g), (m) => m[1])

// Schema
export const isRef = (obj?: unknown): obj is ReferenceObject => {
  if (typeof obj !== 'object' || obj === null) return false
  return '$ref' in obj
}

export type SchemaInput = SchemaObject | SchemaBuilder | ReferenceObject | z.ZodTypeAny

export const toSchema = (schema?: SchemaInput) => {
  if (schema instanceof SchemaBuilder) {
    return schema.toSchema()
  } else if (schema instanceof z.Schema) {
    const res = zodToJsonSchema(schema)
    delete res.$schema
    return res as SchemaObject
  }
  return schema
}

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
