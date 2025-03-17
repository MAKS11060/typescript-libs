#!/usr/bin/env -S deno run -A --watch-hmr

/*
import {o} from './openapi-schema.ts'

// const schema = o.tuple(o.string(), o.number())

// console.log(schema.toSchema())
// console.log(JSON.stringify(schema.toSchema()))

o.string()

const complexSchema = o.object({
  // Базовые типы
  id: o.integer().min(1).description('Unique identifier'),
  name: o.string().min(3).max(50).pattern('^[a-zA-Z ]+$').example('John Doe'),
  isActive: o.boolean().default(true),
  score: o.number().min(0).max(100).multipleOf(0.5),

  // Null и optional
  nullableField: o.string().nullable(),
  optionalField: o.string().optional(),

  // Enum и Literal
  status: o.enum(['active', 'inactive']),
  role: o.literal('admin'),

  // Массивы
  tags: o.array(o.string()).uniqueItems(),
  scores: o.array(o.number()).minItems(3).maxItems(10),

  // Объекты
  address: o.object({
    street: o.string(),
    city: o.string(),
    zipCode: o.string().pattern('^\\d{5}$'),
  }),

  // Union (anyOf)
  contact: o.union(o.string(), o.object({email: o.string().format('email')})),

  // Intersection (allOf)
  userWithPermissions: o.intersection(o.object({userId: o.integer()}), o.object({permissions: o.array(o.string())})),

  // Record
  metadata: o.record('string', o.string()),

  // Map (ассоциативный массив)
  keyValuePairs: o.map(o.string(), o.number()),

  // Set (множество)
  uniqueNumbers: o.set(o.number()),

  // Tuple (кортеж)
  coordinates: o.tuple(o.number(), o.number()),

  // Дополнительные свойства
  additionalPropertiesExample: o
    .object({
      knownProperty: o.string(),
    })
    .additionalProperties(o.boolean()),

  // Property names
  propertyNamesExample: o
    .object({
      key1: o.string(),
      key2: o.string(),
    })
    .propertyNames(o.pattern('^[a-z]+$')),

  // Min/Max properties
  minMaxPropertiesExample: o
    .object({
      a: o.string(),
      b: o.string(),
    })
    .minProperties(1)
    .maxProperties(5),

  // Deprecated
  deprecatedField: o.string().deprecated(),

  // Examples
  exampleField: o.string().example('This is an example'),
  examplesField: o.string().examples(['Example 1', 'Example 2']),

  // Not
  notExample: o.not(o.string()),
})

console.log(complexSchema.toSchema()) */

import {zodToJsonSchema} from 'npm:zod-to-json-schema'
import {z} from 'zod'
import {YAML} from './_deps.ts'

const schema1 = z.object({
  id: z.number().int().describe('The ID'),
  str: z.string(),
  strOptions: z.string().optional(),
  bool: z.boolean().default(true),
  const: z.literal('1'),
  array: z.array(z.string()),
  record: z.record(z.string(), z.number().positive()),
  enum: z.enum(['a', 'b', 'c']),
})
schema1.toSchema() // json-schema

const a = z.object({
  id: z.number(),
  // name: z.string().nullable().describe('Username'),
  // name2: z.string().nullable().optional(),
  // or: z.string().or(z.number()),
  // union: z.union([z.string(), z.number()]),
  // record: z.record(z.string(), z.number()),
  // const: z.literal('str1'),
  // en: z.enum(['a', 'b', 'c']).optional(),
  // a: z.tuple([
  //   z.literal('a'),
  //   z.number().positive(),
  // ])
  obj: z.union([z.object({type: z.literal('a')}), z.object({type: z.literal('b')}), z.object({type: z.literal('b')})]),
  int: z.number().int(),
})

const schema = zodToJsonSchema(a, {})
delete schema.$schema
console.log(YAML.stringify(schema))

export interface ReferenceObject {
  $ref: string
  summary?: string
  description?: string
}
export type SchemaObjectType = 'integer' | 'number' | 'string' | 'boolean' | 'object' | 'null' | 'array'
export interface SchemaObject<Type extends SchemaObjectType | SchemaObjectType[] = any> {
  // discriminator?: DiscriminatorObject;
  readOnly?: boolean
  writeOnly?: boolean
  // xml?: XmlObject;
  // externalDocs?: ExternalDocumentationObject;
  example?: any
  examples?: any[]
  deprecated?: boolean
  type?: Type
  format?: 'int32' | 'int64' | 'float' | 'double' | 'byte' | 'binary' | 'date' | 'date-time' | 'password' | string
  allOf?: (SchemaObject | ReferenceObject)[]
  oneOf?: (SchemaObject | ReferenceObject)[]
  anyOf?: (SchemaObject | ReferenceObject)[]
  not?: SchemaObject | ReferenceObject
  items?: SchemaObject | ReferenceObject
  properties?: {
    [propertyName: string]: SchemaObject | ReferenceObject
  }
  additionalProperties?: SchemaObject | ReferenceObject | boolean
  propertyNames?: SchemaObject | ReferenceObject
  description?: string
  default?: any
  title?: string
  multipleOf?: number
  maximum?: number
  const?: any
  exclusiveMaximum?: number
  minimum?: number
  exclusiveMinimum?: number
  maxLength?: number
  minLength?: number
  pattern?: string
  maxItems?: number
  minItems?: number
  uniqueItems?: boolean
  maxProperties?: number
  minProperties?: number
  required?: string[]
  enum?: any[]
  prefixItems?: (SchemaObject | ReferenceObject)[]
  contentMediaType?: string
  contentEncoding?: string
}
export const isReferenceObject = (obj: any): obj is ReferenceObject => '$ref' in obj

const createSchema = <T extends SchemaObjectType>(type: T): SchemaObject<T> => {
  return {
    type,
  }
}

const min = (schema: SchemaObject, value: number) => {
  if (schema.type === 'integer' || schema.type === 'number') {
    schema.minimum = value
  } else if (schema.type === 'string') {
    schema.minLength = value
  } else if (schema.type === 'array') {
    schema.minItems = value
  }
  return schema
}

const max = (schema: SchemaObject, value: number) => {
  if (schema.type === 'integer' || schema.type === 'number') {
    schema.maximum = value
  } else if (schema.type === 'string') {
    schema.maxLength = value
  } else if (schema.type === 'array') {
    schema.maxItems = value
  }
  return schema
}

const o = {
  string: () => {
    return createSchema('string')
  },
  array: <T extends SchemaObjectType>(item: T) => {
    const schema = createSchema('array')

    schema.items = []

    return {}
  },
}

// o.string()
// const schema = o.array(o.string())
