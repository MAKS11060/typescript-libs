import type {StandardSchemaV1} from '@standard-schema/spec'
import type * as YAML from '@std/yaml/stringify'
import type {ParsePath} from './lib/helpers.ts'
import type {MaybeRef, Ref} from './lib/ref.ts'

export const Internal = Symbol('Internal')

//////////////// Plugin
export interface SchemaPlugin<T = unknown> {
  vendor: string
  registry: boolean
  addSchema(schema: T): {resolve(): any}
  addSchemaGlobal(schema: T, name: string): void
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

export type ContentType = {[K in keyof MIME]: `${K}/${MIME[K]}`}[keyof MIME]

export type ParameterLocation = 'path' | 'query' | 'header' | 'cookie'

export type ExtractSchema<T> = T extends StandardSchemaV1
  ? StandardSchemaV1.InferOutput<T>
  : T extends Ref<{schema: infer O}>
  ? O
  : unknown // no schema plugins

type ExtractTags<T> = T extends {tags: Array<infer U>}
  ? U extends {name: infer N}
    ? N extends string
      ? N
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

////////////////
export interface OpenAPIConfig {
  /**
   * If you turn off `strict` mode, the behavior of the
   * following things will become more free
   *
   * - {@linkcode OpenAPI.security} - You can specify arbitrary values for scopes
   *
   * @default true
   */
  strict?: boolean

  plugins?: {
    schema?: SchemaPlugin[]
  }

  /**
   * OpenAPI Version
   * @default '3.1.1'
   */
  openapi?: string
  info: InfoObject
  tags?: TagObject[]
  servers?: ServerObject[]
  externalDocs?: ExternalDocumentationObject
  jsonSchemaDialect?: string
}

export interface OpenAPI<Config extends OpenAPIConfig = OpenAPIConfig> {
  // [Internal]: {} // TODO: use for save all internal object

  /** Generates an OpenAPI schema */
  toDoc(): any
  /** Generates an OpenAPI schema in `json` format */
  toJSON(pretty?: boolean): string
  /** Generates an OpenAPI schema in `yaml` format */
  toYAML(options?: YAML.StringifyOptions): string

  /** Add `server` global */
  server<URI extends string>(server: ServerObject<URI>): void

  /** Define route */
  addPath<T extends string>(path: T, options?: AddPathItemOptions<T>): AddPath<Config>

  addPath<T extends string>(path: T, pathItem: Ref<AddPath<Config>>): void
  addPath<T extends string>(path: T, options: Partial<AddPathItemOptions<T>>, pathItem: Ref<AddPath<Config>>): void

  // Components
  addSchema<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(name: string, schema: T): Ref<AddSchema<T>>
  addResponse(name: string, handler: (t: AddResponse<Config>) => void): Ref<AddResponse>
  addRequestBody(name: string, handler: (t: AddRequestBody<Config>) => void): Ref<AddRequestBody>
  addParameter<T extends ParameterLocation>(
    name: string,
    location: T,
    paramName: string,
    handler: (t: AddParameter[T]) => void
  ): Ref<AddParameter[T]>
  addHeader(name: string, handler: (t: AddParameterHeader) => void): Ref<AddParameterHeader>

  addExample<T>(name: string, handler: (t: Example<T>) => void): Ref<Example<T>>
  addExample<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    name: string,
    schema: T | MaybeRef<AddSchema<T>>,
    handler: (t: Example<ExtractSchema<T>>) => void
  ): Ref<Example<T>>

  addPathItem(name: string, handler: (t: AddPath) => void): Ref<AddPath>

  /** The object contains methods for creating `security schemes` */
  addSecuritySchema: AddSecuritySchema
  /** Apply a `security` scheme to the whole document */
  security<E>(
    schema: Ref<Security<string, E>>,
    scopes?: Config['strict'] extends false ? ExtractScopesFromFlows<E>[] | string[] : ExtractScopesFromFlows<E>[]
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
  summary(summary: string): this
  describe(description: string): this
  parameter(ref: Ref<AddParameter[keyof AddParameter]>): void
  parameter<T extends ParameterLocation>(location: T, paramName: string, handler: (t: AddParameter[T]) => void): this
  /** Add a `server` specific to this path */
  server<URI extends string>(server: ServerObject<URI>): this

  get(handler: (t: AddOperation<Config>) => void): this
  put(handler: (t: AddOperation<Config>) => void): this
  post(handler: (t: AddOperation<Config>) => void): this
  delete(handler: (t: AddOperation<Config>) => void): this
  options(handler: (t: AddOperation<Config>) => void): this
  head(handler: (t: AddOperation<Config>) => void): this
  patch(handler: (t: AddOperation<Config>) => void): this
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
  summary(summary: string): this
  describe(description: string): this
  externalDocs(doc: ExternalDocumentationObject): this
  operationId(id: string): this
  deprecated(deprecated?: boolean): this

  parameter(ref: Ref<AddParameter[keyof AddParameter]>): void
  parameter<T extends ParameterLocation>(location: T, paramName: string, handler: (t: AddParameter[T]) => void): this

  requestBody(handler: (t: AddRequestBody<Config>) => void): this
  requestBody(requestBody: Ref<AddRequestBody>): void
  response(status: Status, handler: (t: AddResponse<Config>) => void): this
  response(status: Status, response: Ref<AddResponse<Config>>): void

  /** Apply the `security` scheme to the operation */
  security<E>(
    schema: Ref<Security<string, E>>,
    scopes?: Config['strict'] extends false ? ExtractScopesFromFlows<E>[] | string[] : ExtractScopesFromFlows<E>[]
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
    schema: T | MaybeRef<AddSchema<T>>
  ): AddResponseContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<AddSchema<T>>
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
    schema: T | MaybeRef<AddSchema<T>>
  ): AddRequestBodyContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<AddSchema<T>>
  ): AddRequestBodyContent<T>
}

export interface AddRequestBodyContent<T = unknown> extends AddResponseContent<T> {}

export interface AddSchema<T = unknown> {
  // [Internal]: {schema: T}
  schema: T
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
export interface AddParameterInternal {
  [Internal]: {
    in: keyof AddParameter
    name: string
    // common
    description?: string
    required?: boolean
    deprecated?: boolean
    allowEmptyValue?: boolean
    //
    style?: 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'
    explode?: boolean
    allowReserved?: boolean
    // schema?: {}
    schema?: MaybeRef<AddSchema>
    example?: any
    examples?: Map<string, MaybeRef<Example>>
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

export type AddParameter<T = unknown> = {
  path: AddParameterPath<T>
  query: AddParameterQuery<T>
  header: AddParameterHeader<T>
  cookie: AddParameterCookie<T>
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
  T4 extends string = never
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
