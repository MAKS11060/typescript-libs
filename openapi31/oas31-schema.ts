/**
 * OpenAPI 3.1.X Schema
 *
 * https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#schema-1
 *
 */

import {
  ArraySchema,
  BaseSchema as BaseJsonSchema,
  BooleanSchema,
  CombinedSchema,
  NullSchema,
  NumberSchema,
  ObjectSchema,
  StringSchema,
} from './json-schema.ts'

// OpenAPI Object https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#openapi-object
export interface OpenApiDoc {
  openapi: `3.1.${number}`
  info: InfoObject
  jsonSchemaDialect?: string
  servers?: ServerObject[]
  paths: PathsObject
  webhooks?: PathsObject
  components?: ComponentsObject
  security?: SecurityRequirementObject[]
  tags?: TagObject[]
  externalDocs?: ExternalDocumentationObject
}

export interface InfoObject {
  title: string
  version: string
  description?: string
  termsOfService?: string
  contact?: ContactObject
  license?: LicenseObject
}

export interface ContactObject {
  name?: string
  url?: string
  email?: string
}

export interface LicenseObject {
  name: string
  url?: string
}

export interface ServerObject {
  url: string
  description?: string
  variables?: Record<string, ServerVariableObject>
}

export interface ServerVariableObject {
  enum?: string[]
  default: string
  description?: string
}

export interface PathsObject {
  [path: string]: PathItemObject
}

export interface PathItemObject {
  summary?: string
  description?: string
  get?: OperationObject
  put?: OperationObject
  post?: OperationObject
  delete?: OperationObject
  options?: OperationObject
  head?: OperationObject
  patch?: OperationObject
  trace?: OperationObject
  servers?: ServerObject[]
  parameters?: (ParameterObject | ReferenceObject)[]
}

export interface OperationObject {
  tags?: string[]
  summary?: string
  description?: string
  externalDocs?: ExternalDocumentationObject
  operationId?: string
  parameters?: (ParameterObject | ReferenceObject)[]
  requestBody?: RequestBodyObject | ReferenceObject
  responses: ResponsesObject
  callbacks?: Record<string, CallbackObject | ReferenceObject>
  deprecated?: boolean
  security?: SecurityRequirementObject[]
  servers?: ServerObject[]
}

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject>
  responses?: Record<string, ResponseObject | ReferenceObject>
  parameters?: Record<string, ParameterObject | ReferenceObject>
  examples?: Record<string, ExampleObject | ReferenceObject>
  requestBodies?: Record<string, RequestBodyObject | ReferenceObject>
  headers?: Record<string, HeaderObject | ReferenceObject>
  securitySchemes?: Record<string, SecuritySchemeObject | ReferenceObject>
  links?: Record<string, LinkObject | ReferenceObject>
  callbacks?: Record<string, CallbackObject | ReferenceObject>
  pathItems?: Record<string, PathItemObject | ReferenceObject>
}

export interface SecurityRequirementObject {
  [name: string]: string[]
}

export interface ExternalDocumentationObject {
  description?: string
  url: string
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#parameter-object
export type ParameterObject = {
  // Common Fixed Fields https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-10
  name: string
  in: ParameterLocation
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
} & (ParameterObjectWithSchema | ParameterObjectWithContent)
export type ParameterObjectWithSchema = {
  // Fixed Fields for use with schema https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-for-use-with-schema
  style?: ParameterStyle
  explode?: boolean
  allowReserved?: boolean
  schema: SchemaObject
  example?: any
  examples?: Record<string, ExampleObject | ReferenceObject>
}
export type ParameterObjectWithContent = {
  // Fixed Fields for use with content https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-for-use-with-schema
  // content?: Record<string, MediaTypeObject | ReferenceObject>
  content: Record<string, MediaTypeObject | ReferenceObject>
}

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

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#request-body-object
export interface RequestBodyObject {
  description?: string
  content: Record<string, MediaTypeObject>
  required?: boolean
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#media-type-object
export interface MediaTypeObject<TExample = unknown> {
  schema?: SchemaObject
  example?: TExample
  examples?: Record<string, ExampleObject<TExample> | ReferenceObject>
  encoding?: Record<string, EncodingObject>
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#encoding-object
export interface EncodingObject {
  contentType?: string
  headers?: Record<string, HeaderObject | ReferenceObject>

  // https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#fixed-fields-for-rfc6570-style-serialization
  style?: string
  explode?: boolean
  allowReserved?: boolean
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#responses-object
export interface ResponsesObject {
  [statusCode: string]: ResponseObject | ReferenceObject
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#response-object
export interface ResponseObject {
  description: string
  headers?: Record<string, HeaderObject | ReferenceObject>
  content?: Record<string, MediaTypeObject>
  links?: Record<string, LinkObject | ReferenceObject>
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#callback-object
export interface CallbackObject {
  [expression: string]: PathItemObject
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#example-object
export interface ExampleObject<TValue = unknown> {
  summary?: string
  description?: string
  value?: TValue
  externalValue?: string
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#link-object
export interface LinkObject {
  operationId?: string
  operationRef?: string
  parameters?: Record<string, any>
  requestBody?: any
  description?: string
  server?: ServerObject
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#header-object
export interface HeaderObject extends BaseJsonSchema {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#tag-object
export interface TagObject {
  name: string
  description?: string
  externalDocs?: ExternalDocumentationObject
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#reference-object
export interface ReferenceObject {
  $ref: string
  description?: string
  summary?: string
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#schema-object
interface BaseSchema extends BaseJsonSchema {
  discriminator?: DiscriminatorObject
  externalDocs?: ExternalDocumentationObject
  xml?: XmlObject
  /** @deprecated */
  example?: any
}

export type SchemaObject =
  | ReferenceObject
  | (StringSchema & BaseSchema)
  | (NumberSchema & BaseSchema)
  | (BooleanSchema & BaseSchema)
  | (ObjectSchema & BaseSchema)
  | (ArraySchema & BaseSchema)
  | (NullSchema & BaseSchema)
  | (CombinedSchema & BaseSchema)

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#discriminator-object
export interface DiscriminatorObject {
  propertyName: string
  mapping?: Record<string, string>
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#xml-object
export interface XmlObject {
  name?: string
  namespace?: string
  prefix?: string
  attribute?: boolean
  wrapped?: boolean
}

// https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.1.md#security-scheme-object
export type SecuritySchemeObject = ApiKeyOptions | HttpOptions | OAuth2Options | OpenIdConnectOptions | MutualTLSOptions

type ApiKeyOptions = {
  type: 'apiKey'
  name: string
  in: 'header' | 'query' | 'cookie'
}
type HttpOptions =
  | {
      type: 'http'
      scheme: 'basic'
    }
  | {
      type: 'http'
      scheme: 'bearer'
      bearerFormat?: string
    }
type OAuth2Options = {type: 'oauth2'; flows: OAuthFlowsObject}
type OpenIdConnectOptions = {type: 'openIdConnect'; openIdConnectUrl: string}
type MutualTLSOptions = {type: 'mutualTLS'}

export interface OAuthFlowsObject {
  implicit?: {
    authorizationUrl: string
    refreshUrl?: string
    scopes: Record<string, string>
  }
  password?: {
    tokenUrl: string
    refreshUrl?: string
    scopes: Record<string, string>
  }
  clientCredentials?: {
    tokenUrl: string
    refreshUrl?: string
    scopes: Record<string, string>
  }
  authorizationCode?: {
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    scopes: Record<string, string>
  }
}

export interface OAuthFlowObject {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}
