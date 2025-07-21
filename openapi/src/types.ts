import type { StandardSchemaV1 } from '@standard-schema/spec'
import type * as YAML from '@std/yaml/stringify'
import type { ParsePath } from './lib/helpers.ts'
import type { MaybeRef, Ref } from './lib/ref.ts'

export const Internal = Symbol('Internal')

//////////////// Rules
type GetRules<T extends OpenAPIConfig, Rule extends string, Default = never> = T['rules'] extends
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

type ExtractSchemaPlugins<T> = T extends {plugins: {schema: Array<infer O>}} ? O : unknown

////////////////
export type Status = number | `${1 | 2 | 3 | 4 | 5}XX` | 'default'

interface MIME {
  application: 'json' | 'x-www-form-urlencoded' | 'xml' | 'yaml'
  multipart: 'form-data'
  text: '*' | 'plain' | 'html'
}

export type ContentType = { [K in keyof MIME]: `${K}/${MIME[K]}` }[keyof MIME]

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie'

export type ExtractSchema<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T>
  : T extends Ref<{schema: infer O}> ? O
  : unknown // no schema plugins

type ExtractTags<T> = T extends {tags: Array<infer U>} ? U extends {name: infer N} ? N extends string ? N
    : never
  : never
  : never

export type AddPathItemOptions<T extends string> = {
  [K in ParsePath<T>]: (t: AddParameterPath) => void
}

//////////////// Doc
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

export interface TagObject {
  name: string
  description?: string
  externalDocs?: ExternalDocumentationObject
}

export interface ExternalDocumentationObject {
  description?: string
  url: string
}

export interface ServerObject<T extends string = string> {
  url: T
  description?: string
  variables?: Record<ParsePath<T>, ServerVariableObject>
}

export interface ServerVariableObject {
  enum?: string[]
  default: string
  description?: string
}

interface OpenAPIDoc {
  openapi: `${string}.${string}.${string}`
  info: InfoObject
  tags?: TagObject[]
  servers?: ServerObject[]
  externalDocs?: string
  jsonSchemaDialect?: string
  paths: Record<
    string,
    Record<'get' | 'put' | 'post' | 'head' | 'patch' | 'trace' | 'delete' | 'options', {
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
export interface OpenAPIConfig {
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
   * @default '3.1.1'
   */
  openapi?: string

  /**
   * Provides metadata about the API. The metadata MAY be used by tooling as required.
   */
  info: InfoObject

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
  jsonSchemaDialect?: string
}

export interface OpenAPI<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    tags: Set<string>
    servers: Set<ServerObject>
    security: Set<[Ref<Security>, string[] | undefined]>

    paths: Map<string, MaybeRef<AddPath>>
    // TODO: webhooks: Map<string, MaybeRef<AddPath>>

    components: {
      schemas: Map<string, unknown>
      responses: Map<string, AddResponse>
      parameters: Map<string, AddParameter[keyof AddParameter]>
      headers: Map<string, AddParameterHeader>
      examples: Map<string, Example>
      pathItems: Map<string, AddPath>
      requestBodies: Map<string, AddRequestBody>
      securitySchemas: Map<string, Security>
      // TODO: links
      // TODO: callbacks
    }
  }

  /** Generates an OpenAPI schema */
  toDoc(): OpenAPIDoc
  /** Generates an OpenAPI schema in `json` format */
  toJSON(pretty?: boolean): string
  /** Generates an OpenAPI schema in `yaml` format */
  toYAML(options?: YAML.StringifyOptions): string

  /** Add `server` global */
  server<URI extends string>(server: ServerObject<URI>): void

  /**
   * Define route
   *
   * ```yaml
   * paths:
   *   "/": # <-- HERE
   * ```
   */
  addPath<T extends string>(path: T, options?: Partial<AddPathItemOptions<T>>): AddPath<Config>

  addPath<T extends string>(path: T, pathItem: Ref<AddPath<Config>>): void
  addPath<T extends string>(path: T, options: Partial<AddPathItemOptions<T>>, pathItem: Ref<AddPath<Config>>): void

  /**
   * Add a `schema` to components
   *
   * ```yaml
   * components:
   *   schemas: # <-- HERE
   * ```
   */
  addSchema<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    name: string,
    schema: T,
    io?: 'input',
  ): Ref<AddSchema<T>>

  /**
   * Add a `schemas` to components
   *
   * ```yaml
   * components:
   *   schemas: # <-- HERE
   * ```
   */
  // addSchemas<T extends {[K: string]: PluginInputType<ExtractSchemaPlugins<Config>>}>(schemas: T): {
  //   [K in keyof T]: Ref<AddSchema<T[K]>>
  // }
  addSchemas<T extends {[K: string]: PluginInputType<ExtractSchemaPlugins<Config>>}>(schemas: T): {
    [K in keyof T]: Ref<AddSchema<T[K]>>
  }
  /**
   * Add a `response` to components
   *
   * ```yaml
   * components:
   *   responses: # <-- HERE
   * ```
   */
  addResponse(name: string, handler: (t: AddResponse<Config>) => void): Ref<AddResponse>

  /**
   * Add a `requestBodies` to components
   *
   * ```yaml
   * components:
   *   requestBodies: # <-- HERE
   * ```
   */
  addRequestBody(name: string, handler: (t: AddRequestBody<Config>) => void): Ref<AddRequestBody>

  /**
   * Add a `parameter` to components
   *
   * ```yaml
   * components:
   *   parameters: # <-- HERE
   * ```
   */
  addParameter<T extends ParameterLocation>(
    name: string,
    location: T,
    paramName: string,
    handler: (t: AddParameter<unknown, Config>[T]) => void,
  ): Ref<AddParameter[T]>

  /**
   * Add a `header` to components
   *
   * ```yaml
   * components:
   *   headers: # <-- HERE
   * ```
   */
  addHeader(name: string, handler: (t: AddParameterHeader) => void): Ref<AddParameterHeader>

  /**
   * Add a `example` to components
   *
   * ```yaml
   * components:
   *   examples: # <-- HERE
   * ```
   */
  addExample<T>(name: string, handler: (t: Example<T>) => void): Ref<Example<T>>
  addExample<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    name: string,
    schema: T | MaybeRef<AddSchema<T>>,
    handler: (t: Example<ExtractSchema<T>>) => void,
  ): Ref<Example<T>>

  /**
   * Add a `pathItem` to components
   *
   * ```yaml
   * components:
   *   pathItems: # <-- HERE
   * ```
   */
  addPathItem(name: string, handler: (t: AddPath) => void): Ref<AddPath>

  /** The object contains methods for creating `security schemes` */
  addSecuritySchema: AddSecuritySchema
  /** Apply a `security` scheme to the whole document */
  security<E>(
    schema: Ref<Security<string, E>>,
    scopes?: GetRules<Config, 'security', true> extends false ? ExtractScopesFromFlows<E>[] | string[]
      : ExtractScopesFromFlows<E>[],
  ): void
  /** Apply a `security` scheme to the whole document */
  security(securitySchema: Ref<Security<string>>): void
}

export interface AddPath<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    summary?: string
    description?: string
    operations?: Map<string, AddOperation>
    parameters?: Set<MaybeRef<AddParameterInternal>>
    servers?: Set<ServerObject>
    tags?: Set<TagObject>
  }

  /**
   * Add a `summary` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     summary: # <-- HERE
   * ```
   */
  summary(summary: string): this

  /**
   * Add a `description` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     description: # <-- HERE
   * ```
   */
  describe(description: string): this

  /**
   * Add a `parameter` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     parameters:
   *       - # <-- HERE
   * ```
   */
  parameter<T extends ParameterLocation>(
    location: T,
    paramName: string,
    handler: (t: AddParameter<unknown, Config>[T]) => void,
  ): this
  parameter(ref: Ref<AddParameter[keyof AddParameter]>): this

  /**
   * Add a `server` specific to this path
   *
   * ```yaml
   * paths:
   *   '/':
   *     servers:
   *       - # <-- HERE
   * ```
   */
  server<URI extends string>(server: ServerObject<URI>): this

  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     get: # <-- HERE
   * ```
   */
  get(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     get: # <-- HERE
   * ```
   */
  put(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     post: # <-- HERE
   * ```
   */
  post(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     delete: # <-- HERE
   * ```
   */
  delete(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     options: # <-- HERE
   * ```
   */
  options(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     head: # <-- HERE
   * ```
   */
  head(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     patch: # <-- HERE
   * ```
   */
  patch(handler: (t: AddOperation<Config>) => void): this
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     trace: # <-- HERE
   * ```
   */
  trace(handler: (t: AddOperation<Config>) => void): this
}

export interface AddOperation<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    tags?: Set<string>
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    operationId?: string
    deprecated?: boolean

    parameters?: Set<MaybeRef<AddParameterInternal>>
    requestBody?: MaybeRef<AddRequestBody>
    responses?: Map<Status, MaybeRef<AddResponse>>
    security?: Set<[Ref<Security>, string[] | undefined]>
    servers?: Set<ServerObject>
  }

  tag(tag: ExtractTags<Config>): this
  tag(tag: string): this

  /**
   * Add a `summary` for the path `operation`
   *
   * ```yaml
   * paths:
   *   '/':
   *     [METHOD]:
   *       summary: # <-- HERE
   * ```
   */
  summary(summary: string): this

  /**
   * Add a `description` for the `operation`
   *
   * ```yaml
   * paths:
   *   '/':
   *     [METHOD]:
   *       description: # <-- HERE
   * ```
   */
  describe(description: string): this

  externalDocs(doc: ExternalDocumentationObject): this
  operationId(id: string): this
  deprecated(deprecated?: boolean): this

  parameter<T extends ParameterLocation>(location: T, paramName: string, handler: (t: AddParameter[T]) => void): this
  parameter(ref: Ref<AddParameter[keyof AddParameter]>): this

  requestBody(handler: (t: AddRequestBody<Config>) => void): this
  requestBody(requestBody: Ref<AddRequestBody>): this

  response(status: Status, handler: (t: AddResponse<Config>) => void): this
  response(status: Status, response: Ref<AddResponse<Config>>): this

  /** Apply the `security` scheme to the operation */
  security<E>(
    schema: Ref<Security<string, E>>,
    scopes?: GetRules<Config, 'security', true> extends false //
      ? ExtractScopesFromFlows<E>[] | string[]
      : ExtractScopesFromFlows<E>[],
  ): void
  /** Apply the `security` scheme to the operation */
  security(securitySchema: Ref<Security<string>>): void

  /** Add a `server` specific to the operation */
  server<URI extends string>(server: ServerObject<URI>): void
}

export interface AddResponse<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    description?: string
    headers?: Map<string, MaybeRef<AddParameterHeader>>
    content?: Map<string, AddResponseContent>
    // links?: Map<string, LinkData>
  }
  describe(description: string): this
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: ContentType,
    schema: T | MaybeRef<AddSchema<T>>,
  ): AddResponseContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<AddSchema<T>>,
  ): AddResponseContent<T>
  header(name: string, handler: (t: AddParameterHeader) => void): this
  header(name: string, ref: Ref<AddParameterHeader>): this
}

export interface AddResponseContent<T = unknown> {
  [Internal]: {
    schema?: MaybeRef<AddSchema>
    examples?: Map<string, MaybeRef<Example>>
  }
  example(name: string, handler: (t: Example<ExtractSchema<T>>) => void): this
  example(name: string, example: Ref<Example>): this
}

export interface AddRequestBody<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    description?: string
    required?: boolean
    content?: Map<string, AddRequestBodyContent>
  }
  describe(description: string): this
  required(required?: boolean): this
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: ContentType,
    schema: T | MaybeRef<AddSchema<T>>,
  ): AddRequestBodyContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<AddSchema<T>>,
  ): AddRequestBodyContent<T>
}

export interface AddRequestBodyContent<T = unknown> extends AddResponseContent<T> {}

export interface AddSchema<T = unknown> {
  schema: T
  /** Schema name */
  name: string
}

export interface Example<T = unknown> {
  [Internal]: {
    summary?: string
    description?: string
    value?: T
    externalValue?: string
  }
  summary(summary: string): this
  describe(description: string): this
  value(value: T): this
  externalValue(uri: string): this
}

//////////////// Parameters
export interface AddParameterContent<T = unknown> extends AddResponseContent<T> {}

export interface AddParameterInternal {
  [Internal]: {
    in: keyof AddParameter
    name: string
    // common
    description?: string
    required?: boolean
    deprecated?: boolean
    allowEmptyValue?: boolean
    // with schema
    style?: 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'
    explode?: boolean
    allowReserved?: boolean
    schema?: MaybeRef<AddSchema>
    example?: any
    examples?: Map<string, MaybeRef<Example>>
    // with content
    content?: Map<string, AddParameterContent>
  }
}

export type AddParameterPath<T = unknown> = {
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
    schema: T | MaybeRef<AddSchema<T>>,
  ): AddResponseContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<AddSchema<T>>,
  ): AddResponseContent<T>
}

export type AddParameter<T = unknown, Config extends OpenAPIConfig = OpenAPIConfig> = {
  path: AddParameterPath<T> & AddParameterWithContent<Config>
  query: AddParameterQuery<T> & AddParameterWithContent<Config>
  header: AddParameterHeader<T> & AddParameterWithContent<Config>
  cookie: AddParameterCookie<T> & AddParameterWithContent<Config>
}

//////////////// Security
export interface AddSecuritySchema {
  /** Creates a schema that allows access without authorization */
  anonymous(): Ref<Security<'none'>>
  /** Creates a schema that allows access with authorization via `http` header */
  http(name: string, scheme: 'basic'): Ref<Security<'http'>>
  http(name: string, scheme: 'bearer', bearerFormat?: 'JWT'): Ref<Security<'http'>>
  http(name: string, scheme: string, bearerFormat?: string): Ref<Security<'http'>>
  apiKey(name: string, location: 'header' | 'query' | 'cookie', paramName: string): Ref<Security<'apiKey'>>
  oauth2<T extends OAuthFlowsObject>(name: string, flows: T): Ref<Security<'oauth2', T>>
  openIdConnect(name: string, openIdConnectUrl: string): Ref<Security<'openIdConnect'>>
  mutualTLS(name: string): Ref<Security<'mutualTLS'>>
}

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
