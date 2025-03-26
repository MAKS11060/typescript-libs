/**
 * JSON Schema 2020-12
 */

export type JsonSchema =
  | StringSchema
  | NumberSchema
  | BooleanSchema
  | ObjectSchema
  | ArraySchema
  | NullSchema
  | CombinedSchema
  | ReferenceObject //

export type JsonSchemaType =
  | StringSchema['type']
  | NumberSchema['type']
  | BooleanSchema['type']
  | ObjectSchema['type']
  | ArraySchema['type']
  | NullSchema['type']

export interface BaseSchema {
  deprecated?: boolean
  description?: string
  example?: any
  examples?: any[]
  readOnly?: boolean
  writeOnly?: boolean
}

export type SchemaFormat =
  | 'int32'
  | 'int64'
  | 'float'
  | 'double'
  | 'byte'
  | 'binary'
  | 'date'
  | 'date-time'
  | 'password'
  | 'email'
  | 'idn-email'
  | 'hostname'
  | 'idn-hostname'
  | 'ipv4'
  | 'ipv6'
  | 'uri'
  | 'uri-reference'
  | 'iri'
  | 'iri-reference'
  | 'uuid'
  | 'json-pointer'
  | 'relative-json-pointer'
  | 'regex'
// | string

export interface StringSchema extends BaseSchema {
  type: 'string'
  format?: SchemaFormat
  enum?: string[]
  const?: string
  maxLength?: number
  minLength?: number
  pattern?: string
  default?: string //
}

export interface NumberSchema extends BaseSchema {
  type: 'number' | 'integer'
  format?: SchemaFormat
  enum?: number[]
  const?: number
  default?: number
  maximum?: number
  minimum?: number
  exclusiveMaximum?: number
  exclusiveMinimum?: number
  multipleOf?: number
}

export interface BooleanSchema extends BaseSchema {
  type: 'boolean'
  default?: boolean
}

export interface ObjectSchema extends BaseSchema {
  type: 'object'
  properties?: Record<string, JsonSchema>
  additionalProperties?: boolean | JsonSchema
  required?: string[]
  minProperties?: number
  maxProperties?: number
  //
  dependentRequired?: Record<string, string[]>
  unevaluatedProperties?: boolean | JsonSchema
}

export interface ArraySchema extends BaseSchema {
  type: 'array'
  items?: JsonSchema
  prefixItems?: JsonSchema[] // Draft 2020-12
  maxItems?: number
  minItems?: number
  uniqueItems?: boolean
  contains?: JsonSchema
  minContains?: number
  maxContains?: number
  unevaluatedItems?: boolean | JsonSchema
}

export interface NullSchema extends BaseSchema {
  type: 'null'
}

export interface CombinedSchema extends BaseSchema {
  allOf?: JsonSchema[]
  anyOf?: JsonSchema[]
  oneOf?: JsonSchema[]
  not?: JsonSchema
  if?: JsonSchema
  then?: JsonSchema
  else?: JsonSchema
}

export interface ReferenceObject {
  $ref: string
}
