import type {
  ArraySchema,
  BaseSchema,
  BooleanSchema,
  CombinedSchema,
  JsonSchema,
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

//
// Возможные значения для параметра `in`
type ParameterLocation = 'query' | 'header' | 'path' | 'cookie'

type ParameterStyle = 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'

interface BaseParameter {
  name: string
  in: ParameterLocation
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: ParameterStyle
  explode?: boolean
  allowReserved?: boolean
  schema?: JsonSchema
  example?: any
  examples?: Record<string, ExampleObject | ReferenceObject>
  content?: Record<string, MediaTypeObject>
}

export type ParameterObject = BaseParameter & {
  // Ограничения для style в зависимости от расположения параметра
  style?: ParameterStyle
  explode?: boolean
} & (
    | {in: 'path'; style?: 'matrix' | 'label' | 'simple'; required: true}
    | {in: 'query'; style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'}
    | {in: 'header'; style?: 'simple'}
    | {in: 'cookie'; style?: 'form'}
  )

const a: ParameterObject = {
  name: 'test',
  in: 'path',
  required: true,
}