import {
  ContentObject,
  ExampleObject,
  ExamplesObject,
  ExternalDocumentationObject,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  ReferenceObject,
  ResponseObject,
  SchemaObject,
  TagObject,
} from 'npm:openapi3-ts/oas31'
import {extractParams, mergeTags, ParsePath} from './_utils.ts'
import {o, SchemaBuilder} from './openapi-schema.ts'

SchemaBuilder

export type ContentType = 'application/json' | 'text/plain'

type SchemaInput = SchemaObject | SchemaBuilder | ReferenceObject

const toSchema = (schema?: SchemaObject | SchemaBuilder | ReferenceObject) =>
  schema instanceof SchemaBuilder ? schema.toSchema() : schema

const createRef = (type: 'schemas', name: string) => {
  return {$ref: `#/components/${type}/${name}`}
}

//
// export const addPath = <Path extends string>(
//   path: Path,
//   options: {params?: {[K in ParsePath<Path>]?: {description?: string}}} = {}
// ) => {
//   const params = Array.from(path.matchAll(/\{([^}]+)\}/g), (m) => m[1])
//   const pathItem: PathItemObject = {
//     parameters: params.map((param) => ({
//       in: 'path',
//       name: param,
//       required: true,
//       schema: {type: 'string'},
//       description: options.params?.[param as ParsePath<Path>]?.description,
//     })) as ParameterObject[],
//   }
//   openapi.paths ??= {}
//   openapi.paths[path] = pathItem

//   const operations = {
//     get: (handler: (t: RequestBuilder) => void) => {
//       const op = createOperation()
//       handler(op)
//       pathItem.get = op.build()
//     },
//     post: (handler: (t: RequestBuilder) => void) => {
//       const op = createOperation()
//       handler(op)
//       pathItem.post = op.build()
//     },
//   }

//   return {pathItem, ...operations}
// }

// // Типы для состояний билдера
// type RequestBuilder = ReturnType<typeof createOperation>

// const createOperation = () => {
//   const operation: OperationObject = {}

//   // Состояние после вызова request
//   const requestBuilder = (type: 'query' | 'header') => {
//     operation.parameters ??= []
//     operation.parameters.push({in: type, name: type, required: true, schema: {type: 'string'}})

//     const describe = (description: string) => {
//       if (operation.parameters) {
//         const lastParam = operation.parameters[operation.parameters.length - 1]
//         lastParam.description = description
//       }
//       return {describe, schema}
//     }

//     const schema = (schema: SchemaObject) => {
//       if (operation.parameters) {
//         const lastParam = operation.parameters[operation.parameters.length - 1]
//         lastParam.schema = schema
//       }
//       return {describe, schema}
//     }

//     return {describe, schema}
//   }

//   // Состояние после вызова requestBody
//   const requestBodyBuilder = (contentType: ContentType) => {
//     operation.requestBody ??= {content: {}}
//     operation.requestBody.content[contentType] = {}

//     const describe = (description: string) => {
//       if (operation.requestBody) operation.requestBody.description = description
//       return {describe, schema}
//     }

//     const schema = (schema: SchemaObject) => {
//       if (operation.requestBody) {
//         const contentTypeKey = Object.keys(operation.requestBody.content)[0] as ContentType
//         operation.requestBody.content[contentTypeKey].schema = schema
//       }
//       return {describe, schema}
//     }

//     return {describe, schema}
//   }

//   // Состояние после вызова response
//   const responseBuilder = (statusCode: number, contentType: ContentType) => {
//     operation.responses ??= {}
//     operation.responses[statusCode] = {description: '', content: {[contentType]: {}}}

//     const describe = (description: string) => {
//       if (operation.responses && operation.responses[statusCode]) {
//         operation.responses[statusCode].description = description
//       }
//       return {describe, schema}
//     }

//     const schema = (schema: SchemaObject) => {
//       if (operation.responses && operation.responses[statusCode]) {
//         const contentTypeKey = Object.keys(operation.responses[statusCode].content)[0] as ContentType
//         operation.responses[statusCode].content[contentTypeKey].schema = schema
//       }
//       return {describe, schema}
//     }

//     return {describe, schema}
//   }

//   const build = () => operation

//   return {
//     request: requestBuilder,
//     requestBody: requestBodyBuilder,
//     response: responseBuilder,
//     build,
//   }
// }

//

const createTag = <Name extends string>(name: Name, options: Omit<TagObject, 'name'>) => {
  return {
    name,
    ...options,
  } satisfies TagObject
}

const openapiService = {
  createTag: <Name extends string>(
    name: Name,
    options: {
      description?: string
      externalDocs?: ExternalDocumentationObject
    }
  ) => {
    return {
      name,
      ...options,
    }
  },
}

export const tagsRegistry = <T extends string>(
  tags: Record<T, {description?: string; externalDocs?: ExternalDocumentationObject}>
) => tags

type CreateOpenApiDoc = {
  openapi?: `3.1.${number}`
  info: {
    title: string
    version: string
  }
  components?: any
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
  describe: (description: string) => void
  summary: (summary: string) => void
  operationId: (id: string) => void

  response: (status: Status) => ResponseContext
}

type ResponseContext = {
  describe: (description: string) => ResponseContext
  content: (contentType: ContentType, schema: SchemaInput) => ResponseContentContext
}

type ResponseContentContext = {
  examples: (name: string, examples: ExampleObject) => ResponseContentContext
}

type OperationHandler = (t: Operation) => void

export const createOpenApiDoc = <Doc extends CreateOpenApiDoc>(doc: Doc) => {
  type TagKeys = keyof Doc['tags']

  const openapi: OpenAPIObject = {
    openapi: doc.openapi ?? '3.1.0',
    info: doc.info,
  }

  const components = new Set<string>()
  const operationIdSet = new Set<string>()

  const addPath = <T extends string>(
    path: T,
    options?: {
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
  ) => {
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

    // register responses

    const _response = (obj: OperationObject, status: Status = 'default') => {
      const response: ResponseObject = {description: `Response ${status}`}
      obj.responses ??= {[status]: response}

      const responseCtx: ResponseContext = {
        describe: (data: string) => {
          _describe(response, data)
          return responseCtx
        },
        content: (contentType, schema) => {
          const content: ContentObject = {
            [contentType]: {
              schema: toSchema(schema),
            },
          }

          response.content = content

          // response.content ??= {[contentType]: {}}
          // response.content[contentType].schema = toSchema(schema)
          // return responseSelf

          const ctx: ResponseContentContext = {
            examples: (name, examples) => {
              // content.examples[name] = examples

              return ctx
            },
          }
          return ctx
        },
      }

      return responseCtx
    }

    // const tags = (obj: {tags?: string[]}, tags: string[]) => {
    //   obj.tags = typeof tags === 'string' ? [tags] : tags
    // }

    const registerOperation = (method: OperationMethod, initMethod: OperationHandler) => {
      const operation: OperationObject = {}
      pathItem[method] = operation

      // _describe(operation, 'Response ')
      initMethod({
        describe: _describe.bind(null, operation),
        summary: _summary.bind(null, operation),
        operationId: _operationId.bind(null, operation),
        response: _response.bind(null, operation),
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
    //

    openapi.components ??= {[type]: {}}
    openapi.components[type]![name] = data!

    return {$ref}
  }

  const _schemaStore = new WeakMap()
  const addSchema = (name: string, schema: SchemaInput) => {
    const res = _addComponent('schemas', name, toSchema(schema))
    _schemaStore.set(res, schema)
    return res
  }

  return {
    openapi,
    addPath,
    addSchema,
  }
}

//
const tags1 = tagsRegistry({
  Test: {description: 'Tag for testing'},
  Users: {description: 'Tag for testing'},
})
const tags2 = tagsRegistry({
  tag1: {description: 'First tag'},
  tag2: {description: 'Second tag'},
  tag3: {description: 'Third tag'},
})
const tags3 = tagsRegistry({
  tag4: {description: 'Third tag'},
  Test: {externalDocs: {url: 'https://example.com/test'}},
  tag1: {externalDocs: {url: 'https://example.com/tag1'}},
})

export const openApiDoc = createOpenApiDoc({
  info: {
    title: '',
    version: '0.0.1',
  },
  tags: mergeTags(tags1, tags2, tags3),
})

const userSchema = openApiDoc.addSchema(
  'User',
  o.object({
    id: o.string(),
    name: o.string(),
    email: o.string().format('email').optional(),
    isActive: o.boolean().optional(),
    createdAt: o.string().format('date-time').optional(),
  })
)
const usersSchema = openApiDoc.addSchema(
  'Users',
  o.array(userSchema)
)

// const user = o.object({
//   id: o.string(),
//   name: o.string(),
//   email: o.string().format('email').optional(),
//   isActive: o.boolean().optional(),
//   createdAt: o.string().format('date-time').optional(),
// })
// const userRef = {$ref: '#/components/schemas/user'}
// const users = o.array(userRef)


openApiDoc //
  .addPath('/users')
  .describe('test')
  .get((t) => {
    t.summary('List all users')
    t.operationId('listUsers')

    t.response(200) //
      .describe('OK')
      // .content('application/json', userSchema)
      .content('application/json', usersSchema)
      .examples('example 1', {
        value: {
          id: '1',
          name: 'admin',
        },
      })
  })
  .post((t) => {
    t.summary('Create a new user')
    t.operationId('createUser')
  })

// openApiDoc //
//   .addPath('/users/{id}', {
//     params: {
//       id: {
//         schema: o.string().toSchema(),
//         examples: {},
//       },
//     },
//   })
//   .describe('test')
//   .get((t) => {
//     t.summary('List all users')
//     t.response(200).content('application/json')
//   })
//   .post((t) => {})
