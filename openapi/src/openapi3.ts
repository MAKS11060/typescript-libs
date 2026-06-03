import {StandardSchemaV1} from '@standard-schema/spec'
import {stringify as YAML_Stringify, type StringifyOptions as YAML_StringifyOptions} from '@std/yaml'
import {OpenapiVersionDefault} from './constants.ts'
import {entriesToRecord, extractParams, getInternal, isValidComponentName, toProp, toRest} from './lib/helpers.ts'
import {createRef, deRef, isRef, MaybeRef, Ref} from './lib/ref.ts'
import {
  AddParameter,
  AddParameterHeader,
  AddParameterPath,
  AddPathItemOptions,
  ContentType,
  ExternalDocumentationObject,
  ExtractSchema,
  ExtractSchemaPlugins,
  ExtractScopesFromFlows,
  ExtractTags,
  GetRules,
  HttpMethods,
  Internal,
  OAuthFlowsObject,
  OpenAPIConfig,
  ParameterLocation,
  PluginInputType,
  Security,
  ServerObject,
  Status,
  TagObject,
} from './types.ts'

const registerOperationId = (openapi: InstanceType<typeof OpenAPI3>, op: string) => {
  if (openapi.config.rules?.operationId !== 'no-check' && openapi[Internal].operationsIdsRegistry.has(op)) {
    throw new Error(`The operation ID is already in use: ${op}`)
  } else {
    openapi[Internal].operationsIdsRegistry.add(op)
  }
}

// OpenAPI 3
export const createDoc = <const T extends OpenAPIConfig>(config: /* OpenAPIConfig & */ T) => {
  return new OpenAPI3<T>(config)
}

export class OpenAPI3<Config extends OpenAPIConfig> {
  [Internal] = {
    operationsIdsRegistry: new Set<string>(), // store uniq op ids
    componentNames: new WeakMap<WeakKey, string>(), // store component names

    tags: new Set<string>(),
    servers: new Set<ServerObject>(),
    security: new Set<[Ref<Security>, string[] | undefined]>(),

    paths: new Map<string, MaybeRef<PathItem>>(),
    // webhooks: new Map<string, MaybeRef<PathItem>>(),

    components: {
      schemas: new Map<string, unknown>(),
      responses: new Map<string, Response>(),
      parameters: new Map<string, AddParameter[keyof AddParameter]>(),
      headers: new Map<string, AddParameterHeader>(),
      examples: new Map<string, Example>(),
      pathItems: new Map<string, PathItem>(),
      requestBodies: new Map<string, RequestBody>(),
      securitySchemas: new Map<string, Security>(),
      links: new Map<string, any>(),
      callbacks: new Map<string, any>(),
    },
  }

  readonly config: Config
  constructor(config: Config) {
    this.config = config

    // TODO: mb move from class
    this._toComponents = this._toComponents.bind(this)
    this._toContent = this._toContent.bind(this)
    this._toExamples = this._toExamples.bind(this)
    this._toHeader = this._toHeader.bind(this)
    this._toParameter = this._toParameter.bind(this)
    this._toParameters = this._toParameters.bind(this)
    this._toPathItem = this._toPathItem.bind(this)
    this._toRequestBody = this._toRequestBody.bind(this)
    this._toResponses = this._toResponses.bind(this)
    this._toSchema = this._toSchema.bind(this)
    this._toSecurity = this._toSecurity.bind(this)
    this._toServers = this._toServers.bind(this)
    this._toTags = this._toTags.bind(this)
  }

  /** Generates an OpenAPI schema */
  toDoc() /* : OpenAPIDoc */ {
    return {
      openapi: OpenapiVersionDefault, // default
      ...toRest(this.config, {
        openapi: true,
        $self: true,
        info: true,
        tags: true,
        servers: true,
        externalDocs: true,
        jsonSchemaDialect: true,
      }),
      ...toProp('servers', this[Internal].servers, this._toServers),
      ...toProp('security', this[Internal].security, this._toSecurity),
      ...toProp('tags', this[Internal].tags, this._toTags),
      paths: entriesToRecord(this[Internal].paths, this._toPathItem),
      components: this._toComponents(),
    }
  }
  //
  protected _toServers(servers: Set<ServerObject>) {
    return servers.values().toArray()
  }
  protected _toTags(tags: Set<string>) {
    return tags.values().toArray()
  }
  protected _toSecurity(security: Set<[Ref<Security>, string[] | undefined]>) {
    return security
      .values()
      .map(([sec, scopes]) => {
        const {value} = deRef(sec)
        const name = this[Internal].componentNames.get(value)!

        // allow no-auth
        if (value.type === 'none') return {}
        if (value.type === 'oauth2') return {[name]: scopes ?? []}
        if (value.type === 'openIdConnect') return {[name]: scopes ?? []}
        return {[name]: []}
      })
      .toArray()
  }

  protected _toPathItem(pathItem: MaybeRef<PathItem>) {
    if (isRef(pathItem)) {
      const {value, ref} = deRef(pathItem)
      const name = this[Internal].componentNames.get(value)
      return {$ref: `#/components/pathItems/${name}`, ...ref}
    }

    const internal = getInternal(pathItem) // pathItem
    return {
      ...toRest(internal, {
        summary: true,
        description: true,
      }),
      ...toProp('parameters', internal.parameters, this._toParameters),
      ...toProp('servers', internal.servers, this._toServers),
      ...entriesToRecord(internal.operations!, (el) => {
        const internal = getInternal(el) // operation
        return {
          ...toProp('tags', internal.tags, this._toTags),
          ...toRest(internal, {
            summary: true,
            description: true,
            operationId: true,
            deprecated: true,
            externalDocs: true,
          }),
          ...toProp('servers', internal.servers, this._toServers),
          ...toProp('security', internal.security, this._toSecurity),
          ...toProp('parameters', internal.parameters, this._toParameters),
          ...toProp('requestBody', internal.requestBody, this._toRequestBody),
          ...toProp('responses', internal.responses, this._toResponses),
        }
      }),
    }
  }

  protected _toComponents() {
    return {
      ...toProp('schemas', {}, (v) => {
        const schemas = {
          ...entriesToRecord(this[Internal].components.schemas),
          ...Array.from(this.config.plugins?.schema || [], (plugin) => plugin.getSchemas().schemas)
            .reduce((acc, cur) => ({...acc, ...cur}), {}),
        }
        if (Object.keys(schemas).length) return schemas
      }),
      ...toProp('responses', this[Internal].components.responses, (v) => {
        return entriesToRecord(v, (response) => {
          const internal = getInternal(response)
          internal.description ??= `Response`
          return {
            ...toRest(internal, {description: true}),
            ...toProp('headers', internal.headers, this._toHeader),
            ...toProp('content', internal.content, this._toContent),
          }
        })
      }),
      ...toProp('parameters', this[Internal].components.parameters, (v) => {
        return entriesToRecord(v, (el) => {
          return this._toParameter(el as unknown as Parameter)
        })
      }),
      ...toProp('examples', this[Internal].components.examples, (v) => {
        return entriesToRecord(v, (example) => {
          const internal = getInternal(example)
          return {...internal}
        })
      }),
      ...toProp('requestBodies', this[Internal].components.requestBodies, (v) => {
        return entriesToRecord(v, (el) => {
          const internal = getInternal(el)
          return {
            ...toRest(internal, {
              description: true,
              required: true,
            }),
            ...toProp('content', internal.content, this._toContent),
          }
        })
      }),
      ...toProp('headers', this[Internal].components.headers, this._toHeader),
      ...toProp('securitySchemes', this[Internal].components.securitySchemas, (v) => entriesToRecord(v)),
      // TODO:
      // ...toProp('links', this[Internal].components.links, v => ),
      // ...toProp('callbacks', this[Internal].components.callbacks, v => ),
      ...toProp('pathItems', this[Internal].components.pathItems, (v) => entriesToRecord(v, this._toPathItem)),
      // ...toProp('pathItems', this[Internal].components.pathItems, (v) => {}),
    }
  }

  //
  protected _toHeader(headers: Map<string, MaybeRef<AddParameterHeader>>) {
    return entriesToRecord(headers, (header) => {
      if (isRef(header)) {
        const {value, ref} = deRef(header)
        const name = this[Internal].componentNames.get(value)
        return {$ref: `#/components/headers/${name}`, ...ref}
      }

      const internal = getInternal(header as any as Parameter)
      const {in: location, name, examples, schema, ...rest} = internal
      return {
        ...rest,
        ...toProp('schema', internal.schema, this._toSchema),
        ...toProp('examples', internal.examples, this._toExamples),
      }
    })
  }

  protected _toContent(content: Map<string, ResponseContent | RequestBodyContent>) {
    return entriesToRecord(content, (mediaType) => {
      const internal = getInternal(mediaType)
      return {
        ...toProp('schema', internal.schema, this._toSchema),
        ...toProp('examples', internal.examples, this._toExamples),
      }
    })
  }

  protected _toParameters(parameters: Set<MaybeRef<Parameter>>) {
    return parameters.values().map(this._toParameter).toArray()
  }

  protected _toParameter(parameter: MaybeRef<Parameter>) {
    if (isRef(parameter)) {
      const {value, ref} = deRef(parameter)
      const name = this[Internal].componentNames.get(value)
      return {$ref: `#/components/parameters/${name}`, ...ref}
    }

    const {schema, content, examples, ...internal} = getInternal(parameter)
    return {
      ...internal,
      ...toProp('schema', schema, this._toSchema),
      ...toProp('content', content, this._toContent),
      ...toProp('examples', examples, this._toExamples),
    }
  }

  protected _toRequestBody(res: MaybeRef<RequestBody>) {
    if (isRef(res)) {
      const {value, ref} = deRef(res)
      const name = this[Internal].componentNames.get(value)
      return {$ref: `#/components/requestBodies/${name}`, ...ref}
    }

    const internal = getInternal(res)
    return {
      ...toRest(internal, {
        description: true,
        required: true,
      }),
      ...toProp('content', internal.content, this._toContent),
    }
  }

  protected _toResponses(responses: Map<Status, MaybeRef<Response>>) {
    return entriesToRecord(responses, (res, status) => {
      if (isRef(res)) {
        const {value, ref} = deRef(res)
        const name = this[Internal].componentNames.get(value)
        return {$ref: `#/components/responses/${name}`, ...ref}
      }

      const internal = getInternal(res)
      internal.description ??= `Response ${status}`

      return {
        ...toRest(internal, {description: true}),
        ...toProp('headers', internal.headers, this._toHeader),
        ...toProp('content', internal.content, this._toContent),
      }
    })
  }

  protected _toSchema(schema: MaybeRef<Schema> | unknown) {
    if (isRef<Schema>(schema)) {
      const {value, ref} = deRef(schema)
      const name = value.name ?? this[Internal].componentNames.get(value.schema!)
      return {$ref: `#/components/schemas/${name}`, ...ref}
    }

    // raw schema
    if (this[Internal].componentNames.has(schema as any)) {
      const name = this[Internal].componentNames.get(schema as any)
      return {$ref: `#/components/schemas/${name}`}
    }

    for (const plugin of this.config.plugins?.schema || []) {
      if (plugin.vendor === (schema as any)?.['~standard']?.vendor) {
        const {resolve} = plugin.addSchema(schema)
        return resolve()
      }
    }

    return schema // default / no plugins
  }

  protected _toExamples(examples: Map<string, MaybeRef<Example>>) {
    return entriesToRecord(examples, (el) => {
      if (isRef(el)) {
        const {value, ref} = deRef(el)
        const name = this[Internal].componentNames.get(value)
        return {$ref: `#/components/examples/${name}`, ...ref}
      }
      return getInternal(el)
    })
  }
  //

  /** Generates an OpenAPI schema in `json` format */
  toJSON(pretty?: boolean): string {
    return JSON.stringify(this.toDoc(), null, pretty ? 2 : undefined)
  }

  /** Generates an OpenAPI schema in `yaml` format */
  toYAML(options?: YAML_StringifyOptions): string {
    return YAML_Stringify(this.toDoc(), options)
  }

  /**
   * Add `server` global
   *
   * ```yaml
   * servers:
   *  - # <-- HERE
   * ```
   */
  server<URI extends string>(server: ServerObject<URI>): void {
    this[Internal].servers.add(server)
  }

  /**
   * Define route
   *
   * ```yaml
   * paths:
   *   "/": # <-- HERE
   * ```
   *
   * @example
   * ```ts
   * doc.addPath('/api/{version}', {
   *   version: (t) => t.schema(z.enum(['v1', 'v2'])),
   * })
   * ```
   */
  addPath<T extends string>(path: T, options?: Partial<AddPathItemOptions<T>>): PathItem<Config>
  addPath<T extends string>(path: T, pathItem: Ref<PathItem<Config>>): void
  addPath<T extends string>(path: T, options: Partial<AddPathItemOptions<T>>, pathItem: Ref<PathItem<Config>>): void
  addPath<T extends string>(
    ...args:
      | [path: T, options: Partial<AddPathItemOptions<T>>, pathItem: Ref<PathItem<Config>>]
      | [path: T, pathItem: Ref<PathItem<Config>>]
      | [path: T, options?: Partial<AddPathItemOptions<T>>]
  ): any {
    // addPath(path: string, _options: Partial<AddPathItemOptions<string>>, _pathItem?: Ref<AddPath>) {
    const [path, _options, _pathItem] = args as [
      path: string,
      _options: Partial<AddPathItemOptions<string>>,
      _pathItem?: Ref<PathItem>,
    ]
    if (!path.startsWith('/')) {
      throw new Error(`The path must start with '/'`)
    }

    let options: AddPathItemOptions<string> = {}
    let pathItem: MaybeRef<PathItem>

    if (isRef(_pathItem)) {
      options = _options
      pathItem = _pathItem
    } else if (isRef(_options)) {
      pathItem = _options as Ref<PathItem>
    } else {
      options = _options ?? {}
      pathItem = new PathItem(this)
    }

    for (const param of extractParams(path)) {
      if (isRef(pathItem)) {
        const {value} = deRef(pathItem)
        pathItem = value
      }

      // no ref
      if (param in options) {
        pathItem.parameter('path', param, (options as Record<string, (t: AddParameterPath) => void>)[param])
      } else {
        pathItem.parameter('path', param, (t) => {
          t.schema({type: 'string'})
        })
      }
    }

    this[Internal].paths.set(path, pathItem)
    if (isRef(_pathItem) || isRef(_options)) return void 0 as any

    return pathItem
  }

  /**
   * Add a `schema` to components
   *
   * ```yaml
   * components:
   *   schemas: # <-- HERE
   * ```
   *
   * @example
   * ```ts
   * const user = z.object({
   *   id: z.number(),
   *   username: z.string(),
   * })
   * doc.addSchema('user', user)
   * ```
   */
  addSchema<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    name: string,
    schema: T,
    io?: 'input',
  ): Ref<Schema<T>> {
    isValidComponentName(name)
    if (this[Internal].components.schemas.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    // register the schema using the plugin
    for (const plugin of this.config.plugins?.schema ?? []) {
      if (plugin.vendor === (schema as StandardSchemaV1)?.['~standard']?.vendor) {
        plugin.addSchemaGlobal(schema, name, {io})
        this[Internal].componentNames.set(schema!, name)
        this[Internal].components.schemas.set(name, schema)

        return createRef({
          schema,
          name,
        })
      }
    }

    // register schema as object
    this[Internal].componentNames.set(schema!, name)
    this[Internal].components.schemas.set(name, schema)
    return createRef({
      schema,
      name,
    })
  }

  /**
   * Registering multiple schemas in components
   *
   * ```yaml
   * components:
   *   schemas: # <-- HERE
   * ```
   *
   * @example
   * ```ts
   * const user = z.object({
   *   id: z.number(),
   *   username: z.string(),
   * })
   *
   * const users = z.array(user)
   *
   * doc.addSchemas({user, users})
   * ```
   */
  addSchemas<T extends {[K: string]: PluginInputType<ExtractSchemaPlugins<Config>>}>(schemas: T) {
    return entriesToRecord(
      Object.entries(schemas),
      (schema, name) => {
        return this.addSchema(name, schema)
      },
    ) as { [K in keyof T]: Ref<Schema<T[K]>> }
  }

  /**
   * Add a `response` to components
   *
   * ```yaml
   * components:
   *   responses: # <-- HERE
   * ```
   */
  addResponse(name: string, handler: (t: Response<Config>) => void): Ref<Response> {
    isValidComponentName(name)
    if (this[Internal].components.responses.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    const response = new Response()
    this[Internal].componentNames.set(response, name)
    this[Internal].components.responses.set(name, response)

    handler(response)
    return createRef(response)
  }

  /**
   * Add a `requestBodies` to components
   *
   * ```yaml
   * components:
   *   requestBodies: # <-- HERE
   * ```
   */
  addRequestBody(name: string, handler: (t: RequestBody<Config>) => void): Ref<RequestBody> {
    isValidComponentName(name)
    if (this[Internal].components.requestBodies.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    const requestBody = new RequestBody()
    this[Internal].componentNames.set(requestBody, name)
    this[Internal].components.requestBodies.set(name, requestBody)

    handler(requestBody)
    return createRef(requestBody)
  }

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
  ): Ref<AddParameter[T]> {
    isValidComponentName(name)
    if (this[Internal].components.parameters.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    const parameter = Parameter.create(location, paramName)
    this[Internal].componentNames.set(parameter, name)
    this[Internal].components.parameters.set(name, parameter)

    handler(parameter)
    return createRef(parameter)
  }

  /**
   * Add a `header` to components
   *
   * ```yaml
   * components:
   *   headers: # <-- HERE
   * ```
   */
  addHeader(name: string, handler: (t: AddParameterHeader) => void): Ref<AddParameterHeader> {
    isValidComponentName(name)
    if (this[Internal].components.headers.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    const parameter = Parameter.create('header', '')
    this[Internal].componentNames.set(parameter, name)
    this[Internal].components.headers.set(name, parameter)

    handler(parameter)
    return createRef(parameter)
  }

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
    schema: T | MaybeRef<Schema<T>>,
    handler: (t: Example<ExtractSchema<T>>) => void,
  ): Ref<Example<T>>
  addExample(name: string, schema: unknown | ((t: Example) => void), handler?: (t: Example) => void) {
    isValidComponentName(name)
    if (this[Internal].components.examples.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    const example = new Example()
    this[Internal].componentNames.set(example, name)
    this[Internal].components.examples.set(name, example)

    typeof schema === 'function' ? schema(example) : handler?.(example)
    return createRef(example)
  }

  /**
   * Add a `pathItem` to components
   *
   * ```yaml
   * components:
   *   pathItems: # <-- HERE
   * ```
   */
  addPathItem(name: string, handler: (t: PathItem) => void): Ref<PathItem> {
    isValidComponentName(name)
    if (this[Internal].components.pathItems.has(name)) {
      throw new Error(`Component name is already used: ${name}`)
    }

    const pathItem = new PathItem(this)
    this[Internal].componentNames.set(pathItem, name)
    this[Internal].components.pathItems.set(name, pathItem)

    handler(pathItem)
    return createRef(pathItem)
  }

  /** Register Security schemas */
  addSecuritySchema = new SecuritySchema(this)

  /**
   * Add global `security`
   *
   * ```yaml
   * security:
   *  - # <-- HERE
   * ```
   *
   * @example
   * ```ts
   * const anon = doc.addSecuritySchema.anonymous()
   *
   * doc.security(anon)
   * ```
   */
  security<E>(
    schema: Ref<Security<string, E>>,
    scopes?: GetRules<Config, 'security', true> extends false //
      ? ExtractScopesFromFlows<E>[] | string[]
      : ExtractScopesFromFlows<E>[],
  ): void

  security(securitySchema: Ref<Security<string>>): void
  security(securitySchema: Ref<Security<'openIdConnect'>>, scopes?: string[]): void
  security(sec: Ref<Security>, scopes?: string[]) {
    this[Internal].security ??= new Set()
    this[Internal].security.add([sec, scopes])
  }
}

class SecuritySchema {
  private openapi: InstanceType<typeof OpenAPI3>
  constructor(openapi: InstanceType<typeof OpenAPI3>) {
    this.openapi = openapi
  }

  /** Creates a schema that allows access without authorization */
  anonymous(): Ref<Security<'none'>> {
    return createRef({type: 'none'})
  }

  apiKey(name: string, location: 'header' | 'query' | 'cookie', paramName: string): Ref<Security<'apiKey'>> {
    isValidComponentName(name)
    if (this.openapi[Internal].components.securitySchemas.has(name)) {
      throw new Error(`SecuritySchema name is already used: ${name}`)
    }

    const sec: Security<'apiKey'> = {
      type: 'apiKey',
      in: location,
      name: paramName,
    }

    this.openapi[Internal].components.securitySchemas.set(name, sec)
    this.openapi[Internal].componentNames.set(sec, name)
    return createRef(sec)
  }

  /** Creates a schema that allows access with authorization via `http` header */
  http(name: string, scheme: 'basic'): Ref<Security<'http'>>
  http(name: string, scheme: 'bearer', bearerFormat?: 'JWT'): Ref<Security<'http'>>
  http(name: string, scheme: string, bearerFormat?: string): Ref<Security<'http'>>
  http(name: string, scheme: string, bearerFormat?: string) {
    isValidComponentName(name)
    if (this.openapi[Internal].components.securitySchemas.has(name)) {
      throw new Error(`SecuritySchema name is already used: ${name}`)
    }

    const sec: Security<'http'> = {
      type: 'http',
      scheme,
      // bearerFormat,
      ...toProp('bearerFormat', bearerFormat),
    }

    this.openapi[Internal].components.securitySchemas.set(name, sec)
    this.openapi[Internal].componentNames.set(sec, name)
    return createRef(sec)
  }

  oauth2<T extends OAuthFlowsObject>(name: string, flows: T): Ref<Security<'oauth2', T>> {
    isValidComponentName(name)
    if (this.openapi[Internal].components.securitySchemas.has(name)) {
      throw new Error(`SecuritySchema name is already used: ${name}`)
    }

    const sec: Security<'oauth2'> = {
      type: 'oauth2',
      flows: flows as any,
    }

    this.openapi[Internal].components.securitySchemas.set(name, sec)
    this.openapi[Internal].componentNames.set(sec, name)
    return createRef(sec)
  }

  openIdConnect(name: string, openIdConnectUrl: string): Ref<Security<'openIdConnect'>> {
    isValidComponentName(name)
    if (this.openapi[Internal].components.securitySchemas.has(name)) {
      throw new Error(`SecuritySchema name is already used: ${name}`)
    }

    const sec: Security<'openIdConnect'> = {
      type: 'openIdConnect',
      openIdConnectUrl,
    }

    this.openapi[Internal].components.securitySchemas.set(name, sec)
    this.openapi[Internal].componentNames.set(sec, name)
    return createRef(sec)
  }

  mutualTLS(name: string): Ref<Security<'mutualTLS'>> {
    isValidComponentName(name)
    if (this.openapi[Internal].components.securitySchemas.has(name)) {
      throw new Error(`SecuritySchema name is already used: ${name}`)
    }

    const sec: Security<'mutualTLS'> = {
      type: 'mutualTLS',
    }

    this.openapi[Internal].components.securitySchemas.set(name, sec)
    this.openapi[Internal].componentNames.set(sec, name)
    return createRef(sec)
  }
}

// components
export class PathItem<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    summary?: string
    description?: string
    operations?: Map<string, Operation>
    parameters?: Set<MaybeRef<Parameter>>
    servers?: Set<ServerObject>
    tags?: Set<TagObject>
  } = {
    operations: new Map(),
  }

  private openapi: InstanceType<typeof OpenAPI3>
  constructor(openapi: InstanceType<typeof OpenAPI3>) {
    this.openapi = openapi
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
  summary(summary: string): this {
    this[Internal].summary = summary
    return this
  }

  /**
   * Add a `description` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     description: # <-- HERE
   * ```
   */
  describe(description: string): this {
    this[Internal].description = description
    return this
  }

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
  parameter<T extends ParameterLocation>(
    ...args:
      | [location: T, paramName: string, handler: (t: AddParameter<unknown, Config>[T]) => void]
      | [ref: Ref<AddParameter[keyof AddParameter]>]
  ): this {
    const [location, paramName, handler] = args as [
      location: T,
      paramName: string,
      handler: (t: AddParameter<unknown, Config>[T]) => void,
    ]

    this[Internal].parameters ??= new Set()

    if (isRef<Parameter>(location)) {
      this[Internal].parameters.add(location)
      return this
    }

    const parameter = Parameter.create(location, paramName!)
    this[Internal].parameters.add(parameter as any)
    handler(parameter)
    return this
  }

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
  server<URI extends string>(server: ServerObject<URI>): this {
    this[Internal].servers ??= new Set()
    this[Internal].servers.add(server)
    return this
  }

  #registerOperation(method: HttpMethods, handler: (t: Operation<Config>) => void) {
    const operation = new Operation(this.openapi)

    this[Internal].operations?.set(method, operation)
    handler(operation)

    return this
  }

  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     get: # <-- HERE
   * ```
   */
  get(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('get', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     get: # <-- HERE
   * ```
   */
  put(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('put', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     post: # <-- HERE
   * ```
   */
  post(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('post', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     delete: # <-- HERE
   * ```
   */
  delete(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('delete', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     options: # <-- HERE
   * ```
   */
  options(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('options', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     head: # <-- HERE
   * ```
   */
  head(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('head', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     patch: # <-- HERE
   * ```
   */
  patch(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('patch', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     trace: # <-- HERE
   * ```
   */
  trace(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('trace', handler)
    return this
  }
  /**
   * Add a `method` for the path
   *
   * ```yaml
   * paths:
   *   '/':
   *     query: # <-- HERE
   * ```
   */
  query(handler: (t: Operation<Config>) => void) {
    this.#registerOperation('query', handler)
    return this
  }
}

export class Operation<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    tags?: Set<string>
    summary?: string
    description?: string
    externalDocs?: ExternalDocumentationObject
    operationId?: string
    deprecated?: boolean

    parameters?: Set<MaybeRef<Parameter>>
    requestBody?: MaybeRef<RequestBody>
    responses?: Map<Status, MaybeRef<Response>>
    security?: Set<[Ref<Security>, string[] | undefined]>
    servers?: Set<ServerObject>
  } = {
    responses: new Map(),
  }

  private openapi: InstanceType<typeof OpenAPI3>
  constructor(openapi: InstanceType<typeof OpenAPI3>) {
    this.openapi = openapi
  }

  tag(tag: ExtractTags<Config>): this
  tag(tag: string): this
  tag(tag: string) {
    this[Internal].tags ??= new Set()
    this[Internal].tags.add(tag)
    return this
  }

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
  summary(summary: string): this {
    this[Internal].summary = summary
    return this
  }

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
  describe(description: string): this {
    this[Internal].description = description
    return this
  }

  externalDocs(doc: ExternalDocumentationObject): this {
    this[Internal].externalDocs = doc
    return this
  }

  operationId(id: string): this {
    this[Internal].operationId = id
    registerOperationId(this.openapi, id)

    return this
  }

  deprecated(deprecated?: boolean): this {
    this[Internal].deprecated = deprecated
    return this
  }

  parameter<T extends ParameterLocation>(location: T, paramName: string, handler: (t: AddParameter[T]) => void): this
  parameter(ref: Ref<AddParameter[keyof AddParameter]>): this
  parameter(location: any, paramName?: string, handler?: any) {
    this[Internal].parameters ??= new Set()

    if (isRef<Parameter>(location)) {
      this[Internal].parameters.add(location)
      return this
    }

    const parameter = Parameter.create(location, paramName!)
    this[Internal].parameters.add(parameter)
    handler(parameter)
    return this
  }

  requestBody(handler: (t: RequestBody<Config>) => void): this
  requestBody(requestBody: Ref<RequestBody>): this
  requestBody(handler: any) {
    if (isRef(handler)) {
      this[Internal].requestBody = handler as any
      return this
    }

    const requestBody = new RequestBody()
    this[Internal].requestBody = requestBody
    handler(requestBody)
    return this
  }

  /**
   * Add response
   *
   * ```yaml
   * responses:
   *   [status]: # <-- HERE
   *     description: Response [status]
   * ```
   */
  response(status: Status, handler: (t: Response<Config>) => void): this
  /**
   * Add ref to `responses`
   *
   * ```yaml
   * responses:
   *   [status]:
   *     $ref: '#/components/responses/[ref-name]'
   * ```
   */
  response(status: Status, response: Ref<Response<Config>>): this
  response(status: Status, handler: any) {
    this[Internal].responses ??= new Map()
    if (isRef(handler)) {
      this[Internal].responses.set(status, handler as any)
      return this
    }

    const response = new Response()
    this[Internal].responses.set(status, response)
    handler(response)
    return this
  }

  /** Apply the `security` scheme to the operation */
  security<E>(
    schema: Ref<Security<string, E>>,
    scopes?: GetRules<Config, 'security', true> extends false //
      ? ExtractScopesFromFlows<E>[] | string[]
      : ExtractScopesFromFlows<E>[],
  ): void

  /** Apply the `security` scheme to the operation */
  security(securitySchema: Ref<Security<string>>): void
  security(securitySchema: Ref<Security<'openIdConnect'>>, scopes?: string[]): void
  security(sec: Ref<Security>, scopes?: string[]) {
    this[Internal].security ??= new Set()
    this[Internal].security.add([sec, scopes])
  }

  /** Add a `server` specific to the operation */
  server<URI extends string>(server: ServerObject<URI>): void {
    this[Internal].servers ??= new Set()
    this[Internal].servers?.add(server)
  }
}

export class Response<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    description?: string
    headers?: Map<string, MaybeRef<AddParameterHeader>>
    content?: Map<string, ResponseContent>
    // links?: Map<string, LinkData>
  } = {}

  /**
   * Add description
   *
   * ```yaml
   * responses:
   *   [status]:
   *     description: # <-- HERE
   * ```
   */
  describe(description: string): this {
    this[Internal].description = description
    return this
  }

  /**
   * Add response `content`
   *
   * ```yaml
   * responses:
   *   [status]:
   *     content: # <-- HERE
   * ```
   */
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: ContentType,
    schema: T | MaybeRef<Schema<T>>,
  ): ResponseContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<Schema<T>>,
  ): ResponseContent<T>
  content(type: string, schema: unknown) {
    this[Internal].content ??= new Map()

    const responseContent = new ResponseContent(schema)
    this[Internal].content.set(type, responseContent)

    return responseContent
  }

  /**
   * Add response `headers`
   *
   * ```yaml
   * responses:
   *   [status]:
   *     headers: # <-- HERE
   * ```
   */
  header(name: string, handler: (t: AddParameterHeader) => void): this
  header(name: string, ref: Ref<AddParameterHeader>): this
  header(name: string, handler: any): this {
    this[Internal].headers ??= new Map()

    if (isRef(handler)) {
      this[Internal].headers.set(name, handler as any)
      return this
    }

    const parameter = Parameter.create('header', name)
    this[Internal].headers.set(name, parameter)
    handler(parameter)

    return this
  }
}

export class ResponseContent<T = unknown> {
  [Internal]: {
    schema?: MaybeRef<Schema>
    examples?: Map<string, MaybeRef<Example>>
  } = {}

  constructor(schema?: MaybeRef<Schema> | unknown) {
    this[Internal].schema = schema as MaybeRef<Schema>
  }

  example(name: string, handler: (t: Example<ExtractSchema<T>>) => void): this
  example(name: string, example: Ref<Example>): this
  example(name: string, handler: any) {
    this[Internal].examples ??= new Map()

    if (isRef(handler)) {
      this[Internal].examples.set(name, handler as any)
      return this
    }

    const example = new Example()
    this[Internal].examples.set(name, example)
    handler(example)

    return this
  }
}

export class RequestBody<Config extends OpenAPIConfig = OpenAPIConfig> {
  [Internal]: {
    description?: string
    required?: boolean
    content?: Map<string, RequestBodyContent>
  } = {}

  describe(description: string): this {
    this[Internal].description = description
    return this
  }

  required(required: boolean = true): this {
    this[Internal].required = required
    return this
  }

  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: ContentType,
    schema: T | MaybeRef<Schema<T>>,
  ): RequestBodyContent<T>
  content<T extends PluginInputType<ExtractSchemaPlugins<Config>>>(
    type: string,
    schema: T | MaybeRef<Schema<T>>,
  ): RequestBodyContent<T>
  content(type: string, schema: any) {
    this[Internal].content ??= new Map()

    const responseContent = new ResponseContent(schema)
    this[Internal].content.set(type, responseContent)

    return responseContent
  }
}

export class RequestBodyContent<T = unknown> extends ResponseContent<T> {} // TODO: check

export class Schema<T = unknown> {
  schema: T
  /** Schema name */
  name: string

  constructor(schema: T, name: string) {
    this.schema = schema
    this.name = name
  }
}

export class Example<T = unknown> {
  [Internal]: {
    summary?: string
    description?: string
    value?: T
    externalValue?: string
  } = {}

  /**
   * Add summary
   *
   * ```yaml
   * examples:
   *   [name]:
   *     summary: # <-- HERE
   * ```
   */
  summary(summary: string): this {
    this[Internal].summary = summary
    return this
  }

  /**
   * Add description
   *
   * ```yaml
   * examples:
   *   [name]:
   *     description: # <-- HERE
   * ```
   */
  describe(description: string): this {
    this[Internal].description = description
    return this
  }

  /**
   * Add value
   *
   * ```yaml
   * examples:
   *   [name]:
   *     value: # <-- HERE
   * ```
   */
  value(value: T): this {
    this[Internal].value = value
    return this
  }

  /**
   * Add externalValue
   *
   * ```yaml
   * examples:
   *   [name]:
   *     externalValue: # <-- HERE
   * ```
   */
  externalValue(uri: string): this {
    this[Internal].externalValue = uri
    return this
  }
}

//
export class Parameter {
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
    schema?: MaybeRef<Schema>
    example?: any
    examples?: Map<string, MaybeRef<Example>>
    // with content
    content?: Map<string, ResponseContent> // TODO: check types
  }

  private constructor(location: ParameterLocation, name: string) {
    this[Internal] = {
      in: location,
      name,
      ...(location === 'path' && {required: true}),
    }
  }

  static create<T extends ParameterLocation>(location: T, name: string): AddParameter[T] {
    return new Parameter(location, name) as unknown as AddParameter[T]
  }

  style(style: Parameters<AddParameter[keyof AddParameter]['style']>[0]) {
    this[Internal].style = style
    return this
  }
  example(name: string, handler: ((t: Example) => void) | Ref<Example>) {
    this[Internal].examples ??= new Map()
    if (isRef(handler)) {
      this[Internal].examples.set(name, handler)
      return this
    }

    const example = new Example()
    this[Internal].examples.set(name, example)
    handler(example)
    return this
  }
  describe(description: string) {
    this[Internal].description = description
    return this
  }
  required(required: boolean = true) {
    this[Internal].required = required
    return this
  }
  deprecated(deprecated: boolean = true) {
    this[Internal].deprecated = deprecated
    return this
  }
  allowEmptyValue(allowEmptyValue: boolean = true) {
    this[Internal].allowEmptyValue = allowEmptyValue
    return this
  }
  explode(explode: boolean = true) {
    this[Internal].explode = explode
    return this
  }
  allowReserved(allowReserved: boolean = true) {
    this[Internal].allowReserved = allowReserved
    return this
  }

  // with schema
  schema(schema: any) {
    if (this[Internal].content) {
      throw new Error('It is not possible to add a schema: the content field already contains a schema.', {
        cause: `the 'schema' field is mutually exclusive with the content field`,
      })
    }

    this[Internal].schema = schema
    return this
  }

  // with content
  content(type: string, schema: any) {
    if (this[Internal].schema) {
      throw new Error('It is impossible to add content: the schema field already contains the schema', {
        cause: `the 'content' field is mutually exclusive with the schema field`,
      })
    }

    this[Internal].content ??= new Map()

    const responseContent = new ResponseContent(schema)
    this[Internal].content.set(type, responseContent)

    return responseContent
  }
}

//

/** Get a list of registered operation IDs */
export const getOperationIds = (openapi: InstanceType<typeof OpenAPI3>): Map<string, string> => {
  const {paths} = getInternal(openapi)
  const res = new Map<string, string>()
  for (const [path, pathItem] of paths) {
    if (isRef(pathItem)) {
      continue // TODO: update this code
    }

    const {operations = []} = getInternal(pathItem)
    for (const [_method, operation] of operations) {
      const {operationId} = getInternal(operation)
      if (operationId) res.set(operationId, path)
    }
  }
  return res
}

/** Get a list of registered `paths` */
export const getPaths = (openapi: InstanceType<typeof OpenAPI3>): Set<string> => {
  const {paths} = getInternal(openapi)
  return new Set(paths.keys())
  // const res = new Set<string>()
  // for (const [path] of paths) {
  //   res.add(path)
  // }
  // return res
}
