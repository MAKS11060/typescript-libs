import type {StandardSchemaV1} from '@standard-schema/spec'
import * as YAML from '@std/yaml/stringify'
import {entriesToRecord, extractParams, toProp, toRest} from './lib/helpers.ts'
import {createRef, deRef, isRef, type MaybeRef, type Ref} from './lib/ref.ts'
import {
  type AddOperation,
  type AddParameter,
  type AddParameterHeader,
  type AddParameterInternal,
  type AddParameterPath,
  type AddPath,
  type AddPathItemOptions,
  type AddRequestBody,
  type AddRequestBodyContent,
  type AddResponse,
  type AddResponseContent,
  type AddSchema,
  type Example,
  Internal,
  type OpenAPI,
  type OpenAPIConfig,
  type ParameterLocation,
  type Security,
  type ServerObject,
  type Status,
} from './types.ts'

const ComponentKeyName = /^[a-zA-Z0-9\.\-_]+$/

const isValidComponentName = (name: string) => {
  if (!ComponentKeyName.test(name)) {
    throw new Error(`Invalid component name: ${name}`, {
      cause: ComponentKeyName,
    })
  }
}

type Context = ReturnType<typeof createContext>

const createContext = (config: OpenAPIConfig) => {
  const operationIds = new Set<string>()

  return {
    internal: {
      operationIds,
    },

    registerOperationId(op: string) {
      if (config.rules?.operationId !== 'no-check' && operationIds.has(op)) {
        throw new Error(`The operation ID is already in use: ${op}`)
      } else {
        operationIds.add(op)
      }
    },
  }
}

/**
 * Create OpenAPI Schema builder
 *
 * @example
 * ```ts
 * const doc = createDoc({
 *   info: {title: 'Test', version: '1.0.0'},
 * })
 *
 * doc
 *   .addPath('/api/path') //
 *   .get((t) => {
 *     t.response(200, (t) => {
 *       t.content('application/json', {type: 'string'})
 *     })
 *   })
 * ```
 */
export const createDoc = <const T extends OpenAPIConfig>(config: OpenAPIConfig & T): OpenAPI<T> => {
  const internal: OpenAPI[typeof Internal] = {
    tags: new Set<string>(),
    servers: new Set<ServerObject>(),
    security: new Set<[Ref<Security>, string[] | undefined]>(),

    paths: new Map<string, MaybeRef<AddPath>>(),
    components: {
      schemas: new Map<string, unknown>(),
      responses: new Map<string, AddResponse>(),
      parameters: new Map<string, AddParameter[keyof AddParameter]>(),
      headers: new Map<string, AddParameterHeader>(),
      examples: new Map<string, Example>(),
      pathItems: new Map<string, AddPath>(),
      requestBodies: new Map<string, AddRequestBody>(),
      securitySchemas: new Map<string, Security>(),
    },
  }

  const components = new WeakMap<WeakKey, string>() // component names
  const context = createContext(config)

  const toComponents = () => ({
    ...toProp('schemas', {}, (v) => {
      const schemas = {
        ...entriesToRecord(internal.components.schemas),
        ...Array.from(config.plugins?.schema || [], (plugin) => plugin.getSchemas().schemas)
          .reduce((acc, cur) => ({...acc, ...cur}), {}),
      }
      if (Object.keys(schemas).length) return schemas
    }),
    ...toProp('responses', internal.components.responses, (v) => {
      return entriesToRecord(v, (response) => {
        const internal = getInternal(response)
        internal.description ??= `Response`
        return {
          ...toRest(internal, {description: true}),
          ...toProp('headers', internal.headers, _toHeader),
          ...toProp('content', internal.content, _toContent),
        }
      })
    }),
    ...toProp('parameters', internal.components.parameters, (v) => {
      return entriesToRecord(v, (el) => {
        return _toParameter(el as unknown as AddParameterInternal)
      })
    }),
    ...toProp('examples', internal.components.examples, (v) => {
      return entriesToRecord(v, (example) => {
        const internal = getInternal(example)
        return {...internal}
      })
    }),
    ...toProp('requestBodies', internal.components.requestBodies, (v) => {
      return entriesToRecord(v, (el) => {
        const internal = getInternal(el)
        return {
          ...toRest(internal, {
            description: true,
            required: true,
          }),
          ...toProp('content', internal.content, _toContent),
        }
      })
    }),
    ...toProp('headers', internal.components.headers, _toHeader),
    ...toProp('securitySchemes', internal.components.securitySchemas, (v) => entriesToRecord(v)),
    // TODO:
    // ...toProp('links', internal.components.links, v => ),
    // ...toProp('callbacks', internal.components.callbacks, v => ),
    ...toProp('pathItems', internal.components.pathItems, (v) => entriesToRecord(v, _toPathItem)),
  })

  const _toHeader = (headers: Map<string, MaybeRef<AddParameterHeader>>) => {
    return entriesToRecord(headers, (header) => {
      if (isRef(header)) {
        const {value, ref} = deRef(header)
        const name = components.get(value)
        return {$ref: `#/components/headers/${name}`, ...ref}
      }

      const internal = getInternal(header as any as AddParameterInternal)
      const {in: location, name, examples, schema, ...rest} = internal
      return {
        ...rest,
        ...toProp('schema', internal.schema, _toSchema),
        ...toProp('examples', internal.examples, _toExamples),
      }
    })
  }

  const _toContent = (content: Map<string, AddResponseContent | AddRequestBodyContent>) => {
    return entriesToRecord(content, (mediaType) => {
      const internal = getInternal(mediaType)
      return {
        ...toProp('schema', internal.schema, _toSchema),
        ...toProp('examples', internal.examples, _toExamples),
      }
    })
  }

  const _toParameters = (parameters: Set<MaybeRef<AddParameterInternal>>) => {
    return parameters.values().map(_toParameter).toArray()
  }

  const _toParameter = (parameter: MaybeRef<AddParameterInternal>) => {
    if (isRef(parameter)) {
      const {value, ref} = deRef(parameter)
      const name = components.get(value)
      return {$ref: `#/components/parameters/${name}`, ...ref}
    }

    const {schema, content, examples, ...internal} = getInternal(parameter)
    return {
      ...internal,
      ...toProp('schema', schema, _toSchema),
      ...toProp('content', content, _toContent),
      ...toProp('examples', examples, _toExamples),
    }
  }

  const _toRequestBody = (res: MaybeRef<AddRequestBody>) => {
    if (isRef(res)) {
      const {value, ref} = deRef(res)
      const name = components.get(value)
      return {$ref: `#/components/requestBodies/${name}`, ...ref}
    }

    const internal = getInternal(res)
    return {
      ...toRest(internal, {
        description: true,
        required: true,
      }),
      ...toProp('content', internal.content, _toContent),
    }
  }

  const _toResponses = (responses: Map<Status, MaybeRef<AddResponse>>) => {
    return entriesToRecord(responses, (res, status) => {
      if (isRef(res)) {
        const {value, ref} = deRef(res)
        const name = components.get(value)
        return {$ref: `#/components/responses/${name}`, ...ref}
      }

      const internal = getInternal(res)
      internal.description ??= `Response ${status}`

      return {
        ...toRest(internal, {description: true}),
        ...toProp('headers', internal.headers, _toHeader),
        ...toProp('content', internal.content, _toContent),
      }
    })
  }

  const _toSchema = (schema: MaybeRef<AddSchema> | unknown) => {
    if (isRef<AddSchema>(schema)) {
      const {value, ref} = deRef(schema)
      const name = value.name ?? components.get(value.schema!)
      return {$ref: `#/components/schemas/${name}`, ...ref}
    }

    // raw schema
    if (components.has(schema as any)) {
      const name = components.get(schema as any)
      return {$ref: `#/components/schemas/${name}`}
    }

    for (const plugin of config.plugins?.schema || []) {
      if (plugin.vendor === (schema as any)?.['~standard']?.vendor) {
        const {resolve} = plugin.addSchema(schema)
        return resolve()
      }
    }

    return schema // default / no plugins
  }

  const _toExamples = (examples: Map<string, MaybeRef<Example>>) => {
    return entriesToRecord(examples, (el) => {
      if (isRef(el)) {
        const {value, ref} = deRef(el)
        const name = components.get(value)
        return {$ref: `#/components/examples/${name}`, ...ref}
      }
      return getInternal(el)
    })
  }

  const _toServers = (servers: Set<ServerObject>) => {
    return servers.values().toArray()
  }

  const _toTags = (tags: Set<string>) => {
    return tags.values().toArray()
  }

  const _toPathItem = (pathItem: MaybeRef<AddPath>) => {
    if (isRef(pathItem)) {
      const {value, ref} = deRef(pathItem)
      const name = components.get(value)
      return {$ref: `#/components/pathItems/${name}`, ...ref}
    }

    const internal = getInternal(pathItem) // pathItem
    return {
      ...toRest(internal, {
        summary: true,
        description: true,
      }),
      ...toProp('parameters', internal.parameters, _toParameters),
      ...toProp('servers', internal.servers, _toServers),
      ...entriesToRecord(internal.operations!, (el) => {
        const internal = getInternal(el) // operation
        return {
          ...toProp('tags', internal.tags, _toTags),
          ...toRest(internal, {
            summary: true,
            description: true,
            operationId: true,
            deprecated: true,
            externalDocs: true,
          }),
          ...toProp('servers', internal.servers, _toServers),
          ...toProp('security', internal.security, _toSecurity),
          ...toProp('parameters', internal.parameters, _toParameters),
          ...toProp('requestBody', internal.requestBody, _toRequestBody),
          ...toProp('responses', internal.responses, _toResponses),
        }
      }),
    }
  }

  const _toSecurity = (security: Set<[Ref<Security>, string[] | undefined]>) => {
    return security
      .values()
      .map(([sec, scopes]) => {
        const {value} = deRef(sec)
        const name = components.get(value)!

        // allow no-auth
        if (value.type === 'none') return {}
        if (value.type === 'oauth2') return {[name]: scopes ?? []}
        if (value.type === 'openIdConnect') return {[name]: scopes ?? []}
        return {[name]: []}
      })
      .toArray()
  }

  return {
    [Internal]: internal,

    toJSON(pretty?: boolean) {
      return JSON.stringify(this.toDoc(), null, pretty ? 2 : undefined)
    },
    toYAML(options?: YAML.StringifyOptions) {
      return YAML.stringify(this.toDoc(), options)
    },
    toDoc(): any {
      return {
        openapi: '3.1.1',
        ...toRest(config, {
          openapi: true,
          info: true,
          tags: true,
          servers: true,
          externalDocs: true,
          jsonSchemaDialect: true,
        }),
        ...toProp('servers', internal.servers, _toServers),
        ...toProp('security', internal.security, _toSecurity),
        ...toProp('tags', internal.tags, _toTags),
        paths: entriesToRecord(internal.paths, _toPathItem),
        components: toComponents(),
      }
    },

    server(server) {
      internal.servers.add(server)
    },

    addPath(path: string, _options: Partial<AddPathItemOptions<string>>, _pathItem?: Ref<AddPath>) {
      if (!path.startsWith('/')) {
        throw new Error(`The path must start with '/'`)
      }

      let options: AddPathItemOptions<string> = {}
      let pathItem: MaybeRef<AddPath>

      if (isRef(_pathItem)) {
        options = _options
        pathItem = _pathItem
      } else if (isRef(_options)) {
        pathItem = _options as Ref<AddPath>
      } else {
        options = _options ?? {}
        pathItem = createPathItem(context)
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

      internal.paths.set(path, pathItem)
      if (isRef(_pathItem) || isRef(_options)) return void 0 as any

      return pathItem
    },

    addSchema(name, schema, io) {
      isValidComponentName(name)
      if (internal.components.schemas.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      // register the schema using the plugin
      for (const plugin of config.plugins?.schema ?? []) {
        if (plugin.vendor === (schema as StandardSchemaV1)?.['~standard']?.vendor) {
          plugin.addSchemaGlobal(schema, name, {io})
          components.set(schema!, name)
          internal.components.schemas.set(name, schema)

          return createRef({
            schema,
            name,
          })
        }
      }

      // register schema as object
      components.set(schema!, name)
      internal.components.schemas.set(name, schema)
      return createRef({
        schema,
        name,
      })
    },

    addSchemas(schemas) {
      return entriesToRecord(
        Object.entries(schemas),
        (schema, name) => {
          return this.addSchema(name, schema)
        },
      ) as any
    },

    addResponse(name, handler) {
      isValidComponentName(name)
      if (internal.components.responses.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      const response = createResponse()
      components.set(response, name)
      internal.components.responses.set(name, response)

      handler(response)
      return createRef(response)
    },

    addRequestBody(name, handler) {
      isValidComponentName(name)
      if (internal.components.requestBodies.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      const requestBody = createRequestBody()
      components.set(requestBody, name)
      internal.components.requestBodies.set(name, requestBody)

      handler(requestBody)
      return createRef(requestBody)
    },

    addParameter(name, location, paramName, handler) {
      isValidComponentName(name)
      if (internal.components.parameters.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      const parameter = createParameter(location, paramName)
      components.set(parameter, name)
      internal.components.parameters.set(name, parameter)

      handler(parameter)
      return createRef(parameter)
    },

    addHeader(name, handler) {
      isValidComponentName(name)
      if (internal.components.headers.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      const parameter = createParameter('header', '')
      components.set(parameter, name)
      internal.components.headers.set(name, parameter)

      handler(parameter)
      return createRef(parameter)
    },

    addExample(name: string, schema: unknown | ((t: Example) => void), handler?: (t: Example) => void) {
      isValidComponentName(name)
      if (internal.components.examples.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      const example = createExample()
      components.set(example, name)
      internal.components.examples.set(name, example)

      typeof schema === 'function' ? schema(example) : handler?.(example)
      return createRef(example)
    },

    addPathItem(name, handler) {
      isValidComponentName(name)
      if (internal.components.pathItems.has(name)) {
        throw new Error(`Component name is already used: ${name}`)
      }

      const pathItem = createPathItem(context)
      components.set(pathItem, name)
      internal.components.pathItems.set(name, pathItem)

      handler(pathItem)
      return createRef(pathItem)
    },

    addSecuritySchema: {
      anonymous() {
        return createRef({type: 'none'})
      },
      apiKey(name, location, paramName) {
        isValidComponentName(name)
        if (internal.components.securitySchemas.has(name)) {
          throw new Error(`SecuritySchema name is already used: ${name}`)
        }

        const sec: Security<'apiKey'> = {
          type: 'apiKey',
          in: location,
          name: paramName,
        }

        internal.components.securitySchemas.set(name, sec)
        components.set(sec, name)
        return createRef(sec)
      },
      http(name, scheme, bearerFormat?: string) {
        isValidComponentName(name)
        if (internal.components.securitySchemas.has(name)) {
          throw new Error(`SecuritySchema name is already used: ${name}`)
        }

        const sec: Security<'http'> = {
          type: 'http',
          scheme,
          // bearerFormat,
          ...toProp('bearerFormat', bearerFormat),
        }

        internal.components.securitySchemas.set(name, sec)
        components.set(sec, name)
        return createRef(sec)
      },
      oauth2(name, flows?: any) {
        isValidComponentName(name)
        if (internal.components.securitySchemas.has(name)) {
          throw new Error(`SecuritySchema name is already used: ${name}`)
        }

        const sec: Security<'oauth2'> = {
          type: 'oauth2',
          flows,
        }

        internal.components.securitySchemas.set(name, sec)
        components.set(sec, name)
        return createRef(sec)
      },
      openIdConnect(name, openIdConnectUrl) {
        isValidComponentName(name)
        if (internal.components.securitySchemas.has(name)) {
          throw new Error(`SecuritySchema name is already used: ${name}`)
        }

        const sec: Security<'openIdConnect'> = {
          type: 'openIdConnect',
          openIdConnectUrl,
        }

        internal.components.securitySchemas.set(name, sec)
        components.set(sec, name)
        return createRef(sec)
      },
      mutualTLS(name) {
        isValidComponentName(name)
        if (internal.components.securitySchemas.has(name)) {
          throw new Error(`SecuritySchema name is already used: ${name}`)
        }

        const sec: Security<'mutualTLS'> = {
          type: 'mutualTLS',
        }

        internal.components.securitySchemas.set(name, sec)
        components.set(sec, name)
        return createRef(sec)
      },
    },

    security(sec: Ref<Security>, scopes?: string[]) {
      internal.security.add([sec, scopes])
    },
  }
}

/**
 * Get `Internal` component data
 */
export const getInternal = <T>(component: {[Internal]: T}) => component[Internal]

const createParameter = <T extends ParameterLocation>(
  location: T,
  name: string,
): AddParameter[T] & AddParameterInternal => {
  const internal: AddParameterInternal[typeof Internal] = {
    in: location,
    name,
    ...(location === 'path' && {required: true}),
  }

  return {
    [Internal]: internal,
    style(style: Parameters<AddParameter[keyof AddParameter]['style']>[0]) {
      internal.style = style
      return this
    },
    example(name: string, handler: ((t: Example) => void) | Ref<Example>) {
      internal.examples ??= new Map()
      if (isRef(handler)) {
        internal.examples.set(name, handler)
        return this
      }

      const example = createExample()
      internal.examples.set(name, example)
      handler(example)
      return this
    },
    describe(description: string) {
      internal.description = description
      return this
    },
    required(required: boolean = true) {
      internal.required = required
      return this
    },
    deprecated(deprecated: boolean = true) {
      internal.deprecated = deprecated
      return this
    },
    allowEmptyValue(allowEmptyValue: boolean = true) {
      internal.allowEmptyValue = allowEmptyValue
      return this
    },
    explode(explode: boolean = true) {
      internal.explode = explode
      return this
    },
    allowReserved(allowReserved: boolean = true) {
      internal.allowReserved = allowReserved
      return this
    },

    // with schema
    schema(schema: any) {
      if (internal.content) {
        throw new Error('It is not possible to add a schema: the content field already contains a schema.', {
          cause: `the 'schema' field is mutually exclusive with the content field`,
        })
      }

      internal.schema = schema
      return this
    },

    // with content
    content(type: string, schema: any) {
      if (internal.schema) {
        throw new Error('It is impossible to add content: the schema field already contains the schema', {
          cause: `the 'content' field is mutually exclusive with the schema field`,
        })
      }

      internal.content ??= new Map()

      const responseContent = createResponseContent(schema)
      internal.content.set(type, responseContent)

      return responseContent
    },
  } as any
}

const createPathItem = (context: Context): AddPath => {
  const internal: AddPath[typeof Internal] = {
    operations: new Map(),
  }

  const _createOp = (method: string, handler: (t: AddOperation) => void) => {
    const operation = createOperation(context)
    internal.operations?.set(method, operation)
    handler(operation)
  }

  return {
    [Internal]: internal,
    summary(summary) {
      internal.summary = summary
      return this
    },
    describe(description) {
      internal.description = description
      return this
    },
    parameter(location: any, paramName?: string, handler?: any) {
      internal.parameters ??= new Set()

      if (isRef<AddParameterInternal>(location)) {
        internal.parameters.add(location)
        return this
      }

      const parameter = createParameter(location, paramName!)
      internal.parameters.add(parameter)
      handler(parameter)
      return this
    },
    server(server) {
      internal.servers ??= new Set()
      internal.servers.add(server)
      return this
    },

    get(handler) {
      _createOp('get', handler)
      return this
    },
    put(handler) {
      _createOp('put', handler)
      return this
    },
    post(handler) {
      _createOp('post', handler)
      return this
    },
    head(handler) {
      _createOp('head', handler)
      return this
    },
    patch(handler) {
      _createOp('patch', handler)
      return this
    },
    trace(handler) {
      _createOp('trace', handler)
      return this
    },
    delete(handler) {
      _createOp('delete', handler)
      return this
    },
    options(handler) {
      _createOp('options', handler)
      return this
    },
  }
}

const createOperation = (context: Context): AddOperation => {
  const internal: AddOperation[typeof Internal] = {
    responses: new Map(),
  }

  return {
    [Internal]: internal,
    tag(tag) {
      internal.tags ??= new Set()
      internal.tags.add(tag)
      return this
    },
    summary(summary) {
      internal.summary = summary
      return this
    },
    describe(description) {
      internal.description = description
      return this
    },
    externalDocs(doc) {
      internal.externalDocs = doc
      return this
    },
    deprecated(deprecated = true) {
      internal.deprecated = deprecated
      return this
    },
    operationId(id) {
      internal.operationId = id
      context.registerOperationId(id)
      return this
    },

    parameter(location: any, paramName?: string, handler?: any) {
      internal.parameters ??= new Set()

      if (isRef<AddParameterInternal>(location)) {
        internal.parameters.add(location)
        return this
      }

      const parameter = createParameter(location, paramName!)
      internal.parameters.add(parameter)
      handler(parameter)
      return this
    },
    requestBody(handler) {
      if (isRef(handler)) {
        internal.requestBody = handler
        return this
      }

      const requestBody = createRequestBody()
      internal.requestBody = requestBody
      handler(requestBody)
      return this
    },
    response(status, handler) {
      internal.responses ??= new Map()
      if (isRef(handler)) {
        internal.responses.set(status, handler)
        return this
      }
      const response = createResponse()
      internal.responses.set(status, response)
      handler(response)
      return this
    },
    security(sec: Ref<Security>, scopes?: string[]) {
      internal.security ??= new Set()
      internal.security.add([sec, scopes])
    },
    server(server) {
      internal.servers ??= new Set()
      internal.servers?.add(server)
    },
  }
}

const createResponse = (): AddResponse => {
  const internal: AddResponse[typeof Internal] = {}

  return {
    [Internal]: internal,
    describe(description) {
      internal.description = description
      return this
    },
    content(type, schema) {
      internal.content ??= new Map()

      const responseContent = createResponseContent(schema)
      internal.content.set(type, responseContent)

      return responseContent
    },
    header(name, handler) {
      internal.headers ??= new Map()

      if (isRef(handler)) {
        internal.headers.set(name, handler)
        return this
      }

      const parameter = createParameter('header', name)
      internal.headers.set(name, parameter)
      handler(parameter)

      return this
    },
  }
}

const createResponseContent = (schema?: MaybeRef<AddSchema> | unknown): AddResponseContent => {
  const internal: AddResponseContent[typeof Internal] = {}
  internal.schema = schema as MaybeRef<AddSchema>

  return {
    [Internal]: internal,
    example(name, handler) {
      internal.examples ??= new Map()

      if (isRef(handler)) {
        internal.examples.set(name, handler)
        return this
      }

      const example = createExample()
      internal.examples.set(name, example)
      handler(example)

      return this
    },
  }
}

const createRequestBody = (): AddRequestBody => {
  const internal: AddRequestBody[typeof Internal] = {}

  return {
    [Internal]: internal,
    describe(description) {
      internal.description = description
      return this
    },
    required(required = true) {
      internal.required = required
      return this
    },
    content(type, schema) {
      internal.content ??= new Map()

      const responseContent = createResponseContent(schema)
      internal.content.set(type, responseContent)

      return responseContent
    },
  }
}

const createExample = (): Example => {
  const internal: Example[typeof Internal] = {}

  return {
    [Internal]: internal,
    summary(summary) {
      internal.summary = summary
      return this
    },
    describe(description) {
      internal.description = description
      return this
    },
    value(value) {
      internal.value = value
      return this
    },
    externalValue(uri) {
      internal.externalValue = uri
      return this
    },
  }
}

//////////////////////////////// Public Utils

/** Get a list of registered operation IDs */
export const getOperationIds = (doc: OpenAPI): Map<string, string> => {
  const {paths} = getInternal(doc)
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
export const getPaths = (doc: OpenAPI): Set<string> => {
  const {paths} = getInternal(doc)
  const res = new Set<string>()
  for (const [path] of paths) {
    res.add(path)
  }
  return res
}
