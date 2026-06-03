import type {StandardSchemaV1} from '@standard-schema/spec'
import type {ParsePath} from './lib/helpers.ts'
import type {MaybeRef, Ref} from './lib/ref.ts'
import type {Example, ResponseContent, Schema} from './openapi3.ts'

export const Internal = Symbol('Internal')

//////////////// Rules
export type GetRules<T extends OpenAPIConfig, Rule extends string, Default = never> = T['rules'] extends
  { [K in Rule]: infer R } ? R
  : Default

export interface OpenAPIRules {
  /**
   * {@linkcode OpenAPI.security} - You can specify arbitrary values for scopes
   * @default true
   */
  security?: boolean

  /**
   * - `strict` - Behavior according to the specification
   * - `no-check` - Allow redefinition
   * @default `strict`
   */
  operationId?: 'strict' | 'no-check'
}

//////////////// Plugins
export interface SchemaPluginConfig {
  /**
   * Whether to extract the `"input"` or `"output"` type. Relevant to transforms, Error converting schema to JSONz, defaults, coerced primitives, etc.
   * - `"output"` - Default. Convert the output schema.
   * - `"input"` - Convert the input schema.
   */
  io?: 'input' | 'output'
}

export interface SchemaPlugin<T = unknown> {
  vendor: string
  registry: boolean
  addSchema(schema: T, options?: SchemaPluginConfig): {resolve(): any}
  addSchemaGlobal(schema: T, name: string, options?: SchemaPluginConfig): void
  getSchemas(): {schemas: Record<string, any>}
}

export type PluginInputType<T> = T extends SchemaPlugin<infer O> ? O : unknown

export type ExtractSchemaPlugins<T> = T extends {plugins: {schema: Array<infer O>}} ? O : unknown

////////////////
type AnyString = string & {}

export type Status = number | `${1 | 2 | 3 | 4 | 5}XX` | 'default'

interface MIME {
  application: 'json' | 'x-www-form-urlencoded' | 'xml' | 'yaml' | 'octet-stream'
  multipart: 'form-data'
  text: '*' | 'plain' | 'html'
}

export type ContentType = { [K in keyof MIME]: `${K}/${MIME[K]}` }[keyof MIME] | AnyString

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie'

export type ExtractSchema<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T>
  : T extends Ref<{schema: infer O}> ? O
  : unknown // no schema plugins

export type ExtractTags<T> = T extends {tags: Array<infer U>} ? U extends {name: infer N} ? N extends string ? N
    : never
  : never
  : never

export type AddPathItemOptions<T extends string> = {
  [K in ParsePath<T>]: (t: AddParameterPath) => void
}

//////////////// Doc
type Extension = {[k: `x-${string}`]: unknown}

export interface InfoObject extends Extension {
  title: string
  version: string
  description?: string
  termsOfService?: string
  contact?: ContactObject
  license?: LicenseObject
}

export interface ContactObject extends Extension {
  name?: string
  url?: string
  email?: string
}

export interface LicenseObject extends Extension {
  name: string
  /** https://spdx.org/licenses/ */
  identifier?: string
  url?: string
}

export interface TagObject {
  name: string
  summary?: string
  description?: string
  externalDocs?: ExternalDocumentationObject
  parent?: string
  kind?: string
}

export interface ExternalDocumentationObject extends Extension {
  description?: string
  url: string
}

export interface ServerObject<T extends string = string> extends Extension {
  url: T
  description?: string
  variables?: Record<ParsePath<T>, ServerVariableObject>
}

export interface ServerVariableObject extends Extension {
  enum?: string[]
  default: string
  description?: string
}

export type HttpMethods = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch' | 'trace' | 'query'

export interface OpenAPIDoc {
  openapi: `${string}.${string}.${string}`
  $self: string
  info: InfoObject
  tags?: TagObject[]
  servers?: ServerObject[]
  externalDocs?: string
  jsonSchemaDialect?: string
  paths: Record<
    string,
    Record<HttpMethods, {
      tags?: string[]
      summary?: string
      description?: string
      externalDocs?: ExternalDocumentationObject
      operationId?: string
      deprecated?: boolean
      parameters?: any[]
      requestBody?: any
      responses?: any
      security?: any
      servers?: any[]
    }>
  >
  components: Record<
    | 'schemas'
    | 'responses'
    | 'parameters'
    | 'headers'
    | 'examples'
    | 'pathItems'
    | 'requestBodies'
    | 'securitySchemas'
    | 'links'
    | 'callbacks',
    Record<string, unknown>
  >
}

//////////////// Config
export interface OpenAPIConfig extends Extension {
  /**
   * Rule settings for the OpenAPI Schema
   */
  rules?: OpenAPIRules

  /**
   * Plugins
   */
  plugins?: {
    schema?: SchemaPlugin[]
  }

  /**
   * OpenAPI Version
   * @default '3.2.0'
   */
  openapi?: string

  $self?: string

  /**
   * Provides metadata about the API. The metadata MAY be used by tooling as required.
   */
  info: InfoObject

  jsonSchemaDialect?: string

  /**
   * A list of `tags` to group paths.
   *
   * The `tags` specified here will be suggested by auto-completion.
   */
  tags?: TagObject[]

  /**
   * An array of `Server Objects`, which provide connectivity information to a target server.
   */
  servers?: ServerObject[]

  /** Additional external documentation. */
  externalDocs?: ExternalDocumentationObject
}

//////////////// Parameters
export type AddParameterPath<T = unknown> = {
  /**
   * Path parameter serialization styles for OpenAPI 3.2.
   *
   * | style | explode | supported | example |
   * | --- | --- | --- | --- |
   * | `simple` | `true` | array, object | `/colors/blue,black` |
   * | `simple` | `false` | array, object | `/colors/blue,black` |
   * | `label` | `true` | array, object | `/.color=blue.black=black` |
   * | `label` | `false` | array, object | `/.blue.black` |
   * | `matrix` | `true` | array, object | `;color=blue;color=black` |
   * | `matrix` | `false` | array, object | `;color=blue,black` |
   */
  style(style: 'matrix' | 'label' | 'simple'): AddParameterPath<T>
  schema<T>(schema: T): AddParameterPath<ExtractSchema<T>>
  describe(description: string): AddParameterPath<T>
  /** @default true */
  required(required?: true): AddParameterPath<T>
  deprecated(deprecated?: boolean): AddParameterPath<T>
  allowEmptyValue(allowEmptyValue?: boolean): AddParameterPath<T>
  example(name: string, handler: (t: Example<T>) => void): AddParameterPath<T>
  example(name: string, ref: Ref<Example<T>>): AddParameterPath<T>
}

export type AddParameterQuery<T = unknown> = {
  /**
   * Query parameter serialization styles for OpenAPI 3.2.
   *
   * | style | explode | supported | example |
   * | ---: | --- | --- | --- |
   * | `form` | `true` | array, object | `?color=blue&color=black` |
   * | `form` | `false` | array, object | `?color=blue,black` |
   * | `spaceDelimited` | `false` | array only | `?color=blue%20black` |
   * | `pipeDelimited` | `false` | array only | `?color=blue\|black` |
   * | `deepObject` | `true` | object only | `?user[role]=admin&user[firstName]=Alex` |
   */
  style(style: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'): AddParameterQuery<T>
  schema<T>(schema: T): AddParameterQuery<ExtractSchema<T>>
  describe(description: string): AddParameterQuery<T>
  required(required?: boolean): AddParameterQuery<T>
  deprecated(deprecated?: boolean): AddParameterQuery<T>
  allowEmptyValue(allowEmptyValue?: boolean): AddParameterQuery<T>
  explode(explode?: boolean): AddParameterQuery<T>
  allowReserved(allowReserved?: boolean): AddParameterQuery<T>
  example(name: string, handler: (t: Example<T>) => void): AddParameterQuery<T>
  example(name: string, ref: Ref<Example<T>>): AddParameterQuery<T>
}

export type AddParameterHeader<T = unknown> = {
  /**
   * Header parameter serialization styles for OpenAPI 3.2.
   *
   * | style | explode | supported | example |
   * | --- | --- | --- | --- |
   * | `simple` | `true` | array, object | `blue,black` |
   * | `simple` | `false` | array, object | `blue,black` |
   */
  style(style: 'simple'): AddParameterHeader<T>
  schema<T>(schema: T): AddParameterHeader<ExtractSchema<T>>
  describe(description: string): AddParameterHeader<T>
  required(required?: boolean): AddParameterHeader<T>
  deprecated(deprecated?: boolean): AddParameterHeader<T>
  explode(explode?: boolean): AddParameterHeader<T>
  example(name: string, handler: (t: Example<T>) => void): AddParameterHeader<T>
  example(name: string, ref: Ref<Example<T>>): AddParameterHeader<T>
}

export type AddParameterCookie<T = unknown> = {
  /**
   * Cookie parameter serialization styles for OpenAPI 3.2.
   *
   * | style | explode | supported | example |
   * | --- | --- | --- | --- |
   * | `form` | `true` | array, object | `color=blue&color=black` |
   * | `form` | `false` | array, object | `color=blue,black` |
   */
  style(style: 'form'): AddParameterCookie<T>
  schema<T>(schema: T): AddParameterCookie<ExtractSchema<T>>
  describe(description: string): AddParameterCookie<T>
  required(required?: boolean): AddParameterCookie<T>
  deprecated(deprecated?: boolean): AddParameterCookie<T>
  allowEmptyValue(allowEmptyValue?: boolean): AddParameterCookie<T>
  explode(explode?: boolean): AddParameterCookie<T>
  example(name: string, handler: (t: Example<T>) => void): AddParameterCookie<T>
  example(name: string, ref: Ref<Example<T>>): AddParameterCookie<T>
}

export type AddParameterWithContent<Config extends OpenAPIConfig = OpenAPIConfig> = {
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: ContentType,
    schema: T | MaybeRef<Schema<T>>,
  ): ResponseContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<Schema<T>>,
  ): ResponseContent<T>
}

export type AddParameter<T = unknown, Config extends OpenAPIConfig = OpenAPIConfig> = {
  path: AddParameterPath<T> & AddParameterWithContent<Config>
  query: AddParameterQuery<T> & AddParameterWithContent<Config>
  header: AddParameterHeader<T> & AddParameterWithContent<Config>
  cookie: AddParameterCookie<T> & AddParameterWithContent<Config>
}

//////////////// Security
export type Security<T = string, E = never> = {
  type: T
  description?: string
  name?: string
  in?: string
  scheme?: string
  bearerFormat?: string
  flows?: E
  openIdConnectUrl?: string
}

export interface OAuthFlowsObject<
  T1 extends string = never,
  T2 extends string = never,
  T3 extends string = never,
  T4 extends string = never,
> {
  authorizationCode?: {
    authorizationUrl: string
    tokenUrl: string
    refreshUrl?: string
    scopes: Record<T1, string>
  }
  clientCredentials?: {
    tokenUrl: string
    refreshUrl?: string
    scopes: Record<T2, string>
  }
  implicit?: {
    authorizationUrl: string
    refreshUrl?: string
    scopes: Record<T3, string>
  }
  password?: {
    tokenUrl: string
    refreshUrl?: string
    scopes: Record<T4, string>
  }
}

export type ExtractScopesFromFlows<T> = {
  [K in keyof T]: T[K] extends {scopes: Record<infer U, string>} ? (U extends string ? U : never) : never
}[keyof T]
