import {StandardSchemaV1} from 'npm:@standard-schema/spec'
import {
  ComponentsObject,
  ContentObject,
  ExampleObject,
  ExamplesObject,
  ExternalDocumentationObject,
  HeaderObject,
  HeadersObject,
  InfoObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterLocation,
  ParameterObject,
  PathItemObject,
  PathsObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  ServerObject,
} from 'npm:openapi3-ts/oas31'
import {YAML} from './_deps.ts'
import {extractParams, isRef, ParsePath, SchemaInput, toSchema} from './_utils.ts'
import {SchemaBuilder} from './openapi-schema.ts'
import {ExampleObject as ExampleObject2} from './types/openapi-schema.ts'

type S = StandardSchemaV1

SchemaBuilder

export type ContentType = 'application/json' | 'text/plain'

export const tagsRegistry = <T extends string>(
  tags: Record<T, {description?: string; externalDocs?: ExternalDocumentationObject}>
) => tags

type CreateOpenApiDoc = {
  openapi?: `3.1.${number}`
  info: InfoObject
  servers?: ServerObject[]
  components?: ComponentsObject
  paths?: PathsObject
  security?: SecurityRequirementObject[]
  externalDocs?: ExternalDocumentationObject
  webhooks?: PathsObject
  // tags?: TagObject[];
  tags?: Record<string, {description?: string; externalDocs?: ExternalDocumentationObject}>
}

type ComponentType =
  | 'schemas'
  | 'responses'
  | 'parameters'
  | 'examples'
  | 'requestBodies'
  | 'headers'
  | 'securitySchemes'
  | 'links'
  | 'callbacks'
type OperationMethod = 'get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace'
type Status = number | `${1 | 2 | 3 | 4 | 5}XX` | 'default'

type Operation = {
  // tags?: (tags: TagKeys) => void
  summary: (summary: string) => void
  describe: (description: string) => void
  operationId: (id: string) => void
  deprecated: () => void
  parameters(parameter: ParameterObject | ReferenceObject): void
  security: (name: string | {name: string}, scope?: string[]) => void
  response: {
    (status: Status): ResponseContext
    (status: Status, ref: ReferenceObject): void
  }
  //
  requestBody: (handler: (requestBody: RequestBodyContext) => void | ReferenceObject) => void
}

type ResponseContext = {
  describe: (description: string) => ResponseContext
  headers: (headers: HeadersObject) => ResponseContext
  content: {
    <T extends SchemaInput>(contentType: ContentType, schema: T): ResponseContentContext<T>
    <T extends SchemaInput>(contentType: string, schema: T): ResponseContentContext<T>
  }
}

type isStandardSchema<T> = T extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T> : unknown

type ResponseContentContext<T = unknown> = {
  headers: (headers: HeadersObject) => ResponseContentContext<T>
  examples: (name: string, examples: ExampleObject2<isStandardSchema<T>>) => ResponseContentContext<T>
  /** @deprecated */
  example: (value: isStandardSchema<T>) => ResponseContentContext<T>
  // examples: (name: string, examples: ExampleObject) => ResponseContentContext<T>
  // example: (value: unknown) => ResponseContentContext<T>
}

type RequestBodyContext = {
  describe: (description: string) => RequestBodyContext
  required: () => RequestBodyContext
  content: {
    (contentType: ContentType, schema: SchemaInput): RequestBodyContext
    (contentType: string, schema: SchemaInput): RequestBodyContext
  }
}

type OperationHandler = (t: Operation) => void

type _Response = {
  (obj: OperationObject, status: Status): ResponseContext
  (obj: OperationObject, status: Status, ref: ReferenceObject): void
}

// SecuritySchemas
type ApiKeyOptions = {type: 'apiKey'; option: {name: string; in: 'header' | 'query' | 'cookie'}}
type HttpOptions =
  | {type: 'http'; option: {scheme: 'basic'}}
  | {type: 'http'; option: {scheme: 'bearer'; bearerFormat?: string}}
type OAuth2Options = {
  type: 'oauth2'
  option: {
    flows:
      | {
          authorizationCode: {
            authorizationUrl: string
            tokenUrl: string
            refreshUrl?: string
            scopes: Record<string, string>
          }
        }
      | {implicit: {authorizationUrl: string; scopes: Record<string, string>}}
      | {password: {tokenUrl: string; scopes: Record<string, string>}}
      | {clientCredentials: {tokenUrl: string; scopes: Record<string, string>}}
  }
}
type OpenIdConnectOptions = {type: 'openIdConnect'; option: {openIdConnectUrl: string}}
type MutualTLSOptions = {type: 'mutualTLS'; option: {}}
type SecuritySchemeOptions = ApiKeyOptions | HttpOptions | OAuth2Options | OpenIdConnectOptions | MutualTLSOptions

export const createOpenApiDoc = <Doc extends CreateOpenApiDoc>(doc: Doc) => {
  type TagKeys = keyof Doc['tags']

  const openapi: OpenAPIObject = {
    openapi: doc.openapi ?? '3.1.0',
    info: doc.info,
    paths: {},
  }

  const components = new Set<string>()
  const operationIdSet = new Set<string>()

  const _addComponent = (type: ComponentType, name: string, data: unknown) => {
    const $ref = `#/components/${type}/${name}`
    if (components.has($ref)) throw new Error(`The '${$ref}' has already been registered`)
    else components.add($ref)

    openapi.components ??= {}
    openapi.components[type] ??= {}
    openapi.components[type][name] = data!

    return {$ref}
  }

  const _describe = (obj: {description?: string}, description: string) => {
    obj.description = description
  }
  const _summary = (obj: {summary?: string}, summary: string) => {
    obj.summary = summary
  }

  const _content = (target: {content?: ContentObject}, contentType: string, schema: SchemaInput) => {
    const mediaTypeObject: MediaTypeObject = {schema: toSchema(schema)}
    target.content ??= {}
    target.content[contentType] = mediaTypeObject
    return mediaTypeObject
  }

  const _examples = (target: {examples?: ExamplesObject; example?: any}, name: string, examples: ExampleObject) => {
    if (target.example) {
      throw new Error("The 'examples' and 'example' properties are mutually exclusive")
    }
    target.examples ??= {}
    target.examples[name] = examples
  }
  const _example = (target: {examples?: ExamplesObject; example?: any}, value: unknown) => {
    if (target.examples) {
      throw new Error("The 'example' and 'examples' properties are mutually exclusive")
    }
    target.example = value
  }

  type AddPathOptions<T extends string> = {
    // tags?: TagKeys | TagKeys[]
    params?: {
      [K in ParsePath<T>]: {
        schema?: SchemaObject | ReferenceObject | SchemaBuilder
        examples?: {
          [param: string]: ExampleObject | ReferenceObject
        }
      }
    }
  }

  const addPath = <T extends string>(path: T, options?: AddPathOptions<T>) => {
    const pathItem = {} as PathItemObject
    const pathParams = extractParams(path).map((name) => {
      const params = options?.params?.[name as ParsePath<T>]
      return {
        in: 'path',
        name,
        examples: params?.examples,
        schema: toSchema(params?.schema),
      } satisfies ParameterObject
    })

    pathItem.parameters ??= []
    pathItem.parameters?.push(...pathParams)

    openapi.paths ??= {}
    openapi.paths[path] = pathItem

    // register responses
    const _response: _Response = (target: OperationObject, status: Status = 'default', ref?: ReferenceObject): any => {
      const response: ResponseObject = target.responses?.[status] ?? {description: `Response ${status}`}

      target.responses ??= {}
      target.responses[status] = ref ?? response
      if (ref) return

      const responseCtx: ResponseContext = {
        describe: (data: string) => {
          _describe(response, data)
          return responseCtx
        },
        headers: (headers: HeadersObject) => {
          response.headers = headers
          return responseCtx
        },
        content: (contentType, schema) => {
          const mediaTypeObject = _content(response, contentType, schema)
          // const mediaTypeObject: MediaTypeObject = {schema: toSchema(schema)}

          // response.content ??= {}
          // response.content[contentType] = mediaTypeObject

          const responseContentContext: ResponseContentContext = {
            headers: (headers: HeadersObject) => {
              // for (const key in headers) {
              //   const header = headers[key] as HeaderObject
              //   header.schema = toSchema(header.schema)
              // }
              response.headers = headers
              return responseContentContext
            },
            examples: (name, examples) => {
              if (mediaTypeObject.example) {
                throw new Error("The 'examples' and 'example' properties are mutually exclusive")
              }
              mediaTypeObject.examples ??= {}
              mediaTypeObject.examples[name] = examples
              return responseContentContext
            },
            example: (value: unknown) => {
              if (mediaTypeObject.examples) {
                throw new Error("The 'example' and 'examples' properties are mutually exclusive")
              }
              mediaTypeObject.example = value
              return responseContentContext
            },
          }

          return responseContentContext
        },
      }

      return responseCtx
    }

    const registerOperation = (method: OperationMethod, cb: OperationHandler) => {
      const operation: OperationObject = {}
      pathItem[method] = operation

      cb({
        describe: (...args) => _describe(operation, ...args),
        summary: (...args) => _summary(operation, ...args),
        operationId: (id) => {
          if (operationIdSet.has(id)) throw new Error(`The 'operationId(${id})' has already been registered`)
          else operationIdSet.add(id)
          operation.operationId = id
        },
        deprecated: () => {
          operation.deprecated = true
        },
        parameters: (parameter) => {
          operation.parameters ??= []
          if (isRef(parameter)) {
            operation.parameters.push(parameter)
          } else {
            operation.parameters.push(parameter)
          }
        },
        response: (status, ref?: ReferenceObject) => {
          return _response(operation, status, ref as any) as any
        },
        security: (name, scope = []) => {
          operation.security ??= []
          if (typeof name === 'string') {
            operation.security?.push({[name]: scope})
          } else {
            operation.security?.push({[name.name]: scope})
          }
        },
        requestBody: (handler) => {
          if (isRef(handler)) {
            operation.requestBody ??= handler
          } else {
            const requestBody: RequestBodyObject = (operation.requestBody && !isRef(operation.requestBody)) ? operation.requestBody : {content: {}}
            operation.requestBody = requestBody

            const ctx: RequestBodyContext = {
              describe: (data: string) => {
                _describe(requestBody, data)
                return ctx
              },
              content: (contentType, schema) => {
                _content(requestBody, contentType, schema)
                return ctx
              },
              required: () => {
                requestBody.required = true
                return ctx
              },
            }

            handler(ctx)
          }
        }
      })
    }

    const pathHandler = {
      describe: (description: string) => {
        _describe(pathItem, description)
        return pathHandler
      },
      summary: (summary: string) => {
        _summary(pathItem, summary)
        return pathHandler
      },

      /** Parameters that are applicable for all the operations described under this path */
      parameters: (parameter: ParameterObject | ReferenceObject) => {
        pathItem.parameters ??= []
        if (isRef(parameter)) {
          pathItem.parameters.push(parameter)
        } else {
          pathItem.parameters.push(parameter)
        }
        return pathHandler
      },

      // methods
      get: (operation: OperationHandler) => {
        registerOperation('get', operation)
        return pathHandler
      },
      put: (operation: OperationHandler) => {
        registerOperation('put', operation)
        return pathHandler
      },
      post: (operation: OperationHandler) => {
        registerOperation('post', operation)
        return pathHandler
      },
      delete: (operation: OperationHandler) => {
        registerOperation('delete', operation)
        return pathHandler
      },
      options: (operation: OperationHandler) => {
        registerOperation('options', operation)
        return pathHandler
      },
      head: (operation: OperationHandler) => {
        registerOperation('head', operation)
        return pathHandler
      },
      patch: (operation: OperationHandler) => {
        registerOperation('patch', operation)
        return pathHandler
      },
      trace: (operation: OperationHandler) => {
        registerOperation('trace', operation)
        return pathHandler
      },
    }

    return pathHandler
  }

  const addSchema = (name: string, schema: SchemaInput) => _addComponent('schemas', name, toSchema(schema))

  const addResponses = (name: string, handler: (t: ResponseContext) => void) => {
    const response: ResponseObject = {description: `Response`}
    const responseCtx: ResponseContext = {
      describe: (data: string) => {
        _describe(response, data)
        return responseCtx
      },
      headers: (headers: HeadersObject) => {
        response.headers = headers
        return responseCtx
      },
      content: (contentType, schema) => {
        const mediaTypeObject = _content(response, contentType, schema)
        const responseContentContext: ResponseContentContext = {
          headers: (headers: HeadersObject) => {
            // for (const key in headers) {
            //   const header = headers[key] as HeaderObject
            //   header.schema = toSchema(header.schema)
            // }
            response.headers = headers
            return responseContentContext
          },
          examples: (name, examples) => {
            _examples(mediaTypeObject, name, examples)
            return responseContentContext
          },
          example: (value: unknown) => {
            _example(mediaTypeObject, value)
            return responseContentContext
          },
        }

        return responseContentContext
      },
    }

    handler(responseCtx)
    return _addComponent('responses', name, response)
  }

  const addParameters = (
    name: string,
    type: ParameterLocation,
    options: {schema: SchemaInput} & Omit<ParameterObject, 'in' | 'name' | 'schema'>
  ) => {
    return _addComponent('parameters', name, {
      in: type,
      name,
      schema: toSchema(options.schema),
      ...(type === 'path' && {required: options.required ?? true}),
    } satisfies ParameterObject)
  }

  const addExamples = (name: string, examples: ExampleObject) => {
    return _addComponent('examples', name, examples)
  }

  const addHeaders = (name: string, header: {schema: SchemaInput} & Omit<HeaderObject, 'schema'>) => {
    if (header.schema) header.schema = toSchema(header.schema)!
    return _addComponent('headers', name, header)
  }

  const addRequestBodies = (name: string, handler: (t: RequestBodyContext) => void) => {
    const requestBody: RequestBodyObject = {content: {}}

    const ctx: RequestBodyContext = {
      describe: (data: string) => {
        _describe(requestBody, data)
        return ctx
      },
      content: (contentType, schema) => {
        _content(requestBody, contentType, schema)
        return ctx
      },
      required: () => {
        requestBody.required = true
        return ctx
      },
    }

    handler(ctx)
    return _addComponent('requestBodies', name, requestBody)
  }

  const addSecuritySchemes = <T extends SecuritySchemeOptions['type']>(
    name: string,
    type: T,
    option: Extract<SecuritySchemeOptions, {type: typeof type}>['option']
  ) => {
    if (type === 'apiKey') {
      if (!('in' in option || 'name' in option)) {
        throw new Error('Invalid apiKey options')
      }
      return {name, ..._addComponent('securitySchemes', name, {type, ...option})}
    }

    if (type === 'http') {
      if (!('scheme' in option)) {
        throw new Error('Invalid http options')
      }
      return {name, ..._addComponent('securitySchemes', name, {type, ...option})}
    }

    if (type === 'oauth2') {
      if (!('flows' in option)) {
        throw new Error('Invalid oauth2 options')
      }
      return {name, ..._addComponent('securitySchemes', name, {type, ...option})}
    }

    if (type === 'openIdConnect') {
      if (!('openIdConnectUrl' in option)) {
        throw new Error('Invalid openIdConnect options')
      }
      return {name, ..._addComponent('securitySchemes', name, {type, ...option})}
    }

    if (type === 'mutualTLS') {
      return {name, ..._addComponent('securitySchemes', name, {type, ...option})}
    }

    throw new Error(`Unsupported security scheme type: ${type}`)
  }
  // const addLinks = (name: string) => _addComponent('links', name, {})
  // const addCallbacks = (name: string) => _addComponent('callbacks', name, {})

  return {
    addPath,

    addSchema,
    addResponses,
    addParameters,
    addExamples,
    addHeaders,
    addRequestBodies,
    addSecuritySchemes: addSecuritySchemes,
    // addLinks,
    // addCallbacks,

    openapi,
    toJSON: (pretty?: boolean) => JSON.stringify(openapi, null, pretty ? 2 : undefined),
    toYAML: (options?: YAML.StringifyOptions) => YAML.stringify(openapi, options),
  }
}
