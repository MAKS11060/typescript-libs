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
