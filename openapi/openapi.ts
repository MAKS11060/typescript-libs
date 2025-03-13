import {
  ComponentsObject,
  ExampleObject,
  ExamplesObject,
  ExternalDocumentationObject,
  HeadersObject,
  MediaTypeObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  PathsObject,
  ReferenceObject,
  ResponseObject,
  SchemaObject,
  SecurityRequirementObject,
  ServerObject,
} from 'npm:openapi3-ts/oas31'
import {YAML} from './_deps.ts'
import {extractParams, ParsePath} from './_utils.ts'
import {SchemaBuilder} from './openapi-schema.ts'

SchemaBuilder

export type ContentType = 'application/json' | 'text/plain'

type SchemaInput = SchemaObject | SchemaBuilder | ReferenceObject

const toSchema = (schema?: SchemaObject | SchemaBuilder | ReferenceObject) =>
  schema instanceof SchemaBuilder ? schema.toSchema() : schema

export const tagsRegistry = <T extends string>(
  tags: Record<T, {description?: string; externalDocs?: ExternalDocumentationObject}>
) => tags

type CreateOpenApiDoc = {
  openapi?: `3.1.${number}`
  info: {
    title: string
    version: string
  }
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

  response: {
    (status: Status): ResponseContext
    (status: Status, ref: ReferenceObject): void
  }
}

type ResponseContext = {
  describe: (description: string) => ResponseContext
  headers: (headers: HeadersObject) => ResponseContext
  content: {
    (contentType: ContentType, schema: SchemaInput): ResponseContentContext
    (contentType: string, schema: SchemaInput): ResponseContentContext
  }
}

type ResponseContentContext = {
  headers: (headers: HeadersObject) => ResponseContentContext
  examples: (name: string, examples: ExampleObject) => ResponseContentContext
  /** @deprecated */
  example: (value: unknown) => ResponseContentContext
}

type OperationHandler = (t: Operation) => void

type _Response = {
  (obj: OperationObject, status: Status): ResponseContext
  (obj: OperationObject, status: Status, ref: ReferenceObject): void
}

export const createOpenApiDoc = <Doc extends CreateOpenApiDoc>(doc: Doc) => {
  type TagKeys = keyof Doc['tags']

  const openapi: OpenAPIObject = {
    openapi: doc.openapi ?? '3.1.0',
    info: doc.info,
    paths: {},
  }

  const components = new Set<string>()
  const operationIdSet = new Set<string>()

  const _describe = (obj: {description?: string}, description: string) => {
    obj.description = description
  }
  const _summary = (obj: {summary?: string}, summary: string) => {
    obj.summary = summary
  }
  const _examples = (obj: {examples?: Record<string, ExamplesObject>}, examples: Record<string, ExamplesObject>) => {
    obj.examples = examples
  }
  const _operationId = (obj: {operationId?: string}, id: string) => {
    if (operationIdSet.has(id)) throw new Error("The 'operationId' has already been registered")
    else operationIdSet.add(id)
    obj.operationId = id
  }

  type AddPathOptions<T extends string> = {
    tags?: TagKeys | TagKeys[]
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

    openapi.paths ??= {}
    openapi.paths[path] = pathItem

    pathItem.parameters ??= []
    pathItem.parameters?.push(...pathParams)

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
          const mediaTypeObject: MediaTypeObject = {schema: toSchema(schema)}

          response.content ??= {}
          response.content[contentType] = mediaTypeObject

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
        operationId: (...args) => _operationId(operation, ...args),
        deprecated: () => {
          operation.deprecated = true
        },
        response: (status, ref?: ReferenceObject) => {
          return _response(operation, status, ref as any) as any
        },
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

  const _addComponent = (type: ComponentType, name: string, data: unknown) => {
    const $ref = `#/components/${type}/${name}`
    if (components.has($ref)) throw new Error(`The '${$ref}' has already been registered`)
    else components.add($ref)

    openapi.components ??= {}
    openapi.components[type] ??= {}
    openapi.components[type][name] = data!

    return {$ref}
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
        const mediaTypeObject: MediaTypeObject = {schema: toSchema(schema)}

        response.content ??= {}
        response.content[contentType] = mediaTypeObject

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

    handler(responseCtx)
    return _addComponent('responses', name, response)
  }
  const addParameters = (name: string) => _addComponent('parameters', name, {})
  const addExamples = (name: string) => _addComponent('examples', name, {})
  const addHeaders = (name: string) => _addComponent('headers', name, {})
  const addLinks = (name: string) => _addComponent('links', name, {})
  const addCallbacks = (name: string) => _addComponent('callbacks', name, {})
  const addRequestBodies = (name: string) => _addComponent('requestBodies', name, {})
  const addSecuritySchemes = (name: string) => _addComponent('securitySchemes', name, {})

  return {
    openapi,
    addPath,

    addSchema,
    addResponses,
    addParameters,
    addExamples,
    addRequestBodies,
    addHeaders,
    addSecuritySchemes,
    addLinks,
    addCallbacks,

    toJSON: (pretty?: boolean) => JSON.stringify(openapi, null, pretty ? 2 : undefined),
    toYAML: (options?: YAML.StringifyOptions) => YAML.stringify(openapi, options),
  }
}
