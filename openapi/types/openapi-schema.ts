#!/usr/bin/env -S deno run -A --env-file --watch

import type {
  ArraySchema,
  BaseSchema,
  BooleanSchema,
  CombinedSchema,
  NullSchema,
  NumberSchema,
  ObjectSchema,
  StringSchema,
} from './json-schema.ts'

export interface ReferenceObject {
  $ref: string
  description?: string
  summary?: string
}

interface DiscriminatorObject {
  propertyName: string
  mapping?: Record<string, string>
}

interface ExternalDocumentationObject {
  description?: string
  url: string
}

interface XmlObject {
  name?: string
  namespace?: string
  prefix?: string
  attribute?: boolean
  wrapped?: boolean
}

interface OpenApiSchema extends BaseSchema {
  discriminator?: DiscriminatorObject
  externalDocs?: ExternalDocumentationObject
  xml?: XmlObject
}

export type OpenApiJsonSchema =
  | ReferenceObject
  | (StringSchema & OpenApiSchema)
  | (NumberSchema & OpenApiSchema)
  | (BooleanSchema & OpenApiSchema)
  | (ObjectSchema & OpenApiSchema)
  | (ArraySchema & OpenApiSchema)
  | (NullSchema & OpenApiSchema)
  | (CombinedSchema & OpenApiSchema)

//
interface MediaTypeObject<TExample = unknown> {
  schema?: OpenApiJsonSchema
  example?: TExample
  examples?: Record<string, ExampleObject<TExample> | ReferenceObject>
  encoding?: Record<string, EncodingObject>
}

export interface ExampleObject<TValue = unknown> {
  summary?: string
  description?: string
  value?: TValue
  externalValue?: string
}

interface EncodingObject {
  contentType?: string
  headers?: Record<string, HeaderObject | ReferenceObject>
  style?: string
  explode?: boolean
  allowReserved?: boolean
}

interface HeaderObject extends BaseSchema {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
}

// Parameters
export type ParameterLocation = 'query' | 'header' | 'path' | 'cookie'
export type ParameterStyle = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'
export type ParameterOptions = {
  path: {
    style?: 'matrix' | 'label' | 'simple'
    /** Always `true` */
    required?: true
  }
  query: {
    style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'
    explode?: boolean
    allowReserved?: boolean
  }
  header: {
    style?: 'simple'
    explode?: boolean
  }
  cookie: {
    style?: 'form'
    explode?: boolean
  }
}

export type ParameterOptionsWithSchema = {
  // Fixed Fields for use with schema https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-for-use-with-schema
  style?: ParameterStyle
  explode?: boolean
  allowReserved?: boolean
  schema: OpenApiJsonSchema
  example?: any
  examples?: Record<string, ExampleObject | ReferenceObject>
}
export type ParameterOptionsWithContent = {
  // Fixed Fields for use with content https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-for-use-with-schema
  content?: Record<string, MediaTypeObject | ReferenceObject>
}

// export type ParameterCommonOptions =

export type ParameterObject = {
  // Common Fixed Fields https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-10
  name: string
  in: ParameterLocation
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
} & (ParameterOptionsWithSchema | ParameterOptionsWithContent)
