#!/usr/bin/env -S deno run -A --env-file --watch

import * as YAML from 'jsr:@std/yaml'
import {ParsePath} from './helpers.ts'
import {ReferenceObject} from './json-schema.ts'
import {ExampleObject, OpenApiDoc, OperationObject, ParameterLocation, ParameterObjectWithSchema, ParameterOptions, PathItemObject, SchemaObject} from './oas31-schema.ts'
import {zodToJsonSchema} from 'npm:zod-to-json-schema'
import {z} from 'zod'
import {StandardSchemaV1} from 'npm:@standard-schema/spec'

// Утилита для проверки, является ли объект ссылкой
const isRef = (obj: any): obj is ReferenceObject => {
  return typeof obj === 'object' && obj !== null && '$ref' in obj
}

type ToSchemaOutput<T> = T extends z.ZodTypeAny ? StandardSchemaV1.InferOutput<T> : never
type ToSchema = {
  (schema: Schema): Schema
  (schema: z.ZodTypeAny): Schema
}

export const toSchema: ToSchema = (schema) => {
  if (schema instanceof z.Schema) {
    const res = zodToJsonSchema(schema)
    delete res.$schema
    return res as Schema
  }

  return schema
}

type Schema = SchemaObject

const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'] as const
type OperationMethod = (typeof methods)[number]

type Status = number | `${1 | 2 | 3 | 4 | 5}XX` | 'default'
type ContentType = 'application/json' | 'text/plain'

type PathParamsOptions<T > = {
  schema?: T | ReferenceObject
  examples?: {
    [param: string]: ExampleObject<T> | ReferenceObject
  }
}

type AddPathOptions<T extends string> = ParsePath<T> extends never
  ? {}
  : {
      params: {
        [K in ParsePath<T>]: PathParamsOptions
      }
    }

// Общие типы для обработчиков
interface DocHandler {
  openapi: OpenApiDoc
  toJSON(pretty: boolean): string
  toYAML(): string

  addPath<T extends string>(path: T, options?: AddPathOptions<T>): PathHandler
  addSchema<S extends Schema>(name: string, schema: S): ReferenceObject & {_schema: ToSchemaOutput<S>}
}

//
let a: DocHandler = {}

a.addPath('/api/{ver}', {
  params: {
    ver: toSchema(z.string()),

  }
})

const userSchema = z.object({id: z.number(), username: z.string()})
const userRef = a.addSchema('User', userSchema)
const userRef2 = a.addSchema('User', {type: 'string'})

// type A = RefToSchema<typeof userRef['types']>

type PathHandler = {
  get(handler: (t: OperationHandler) => void): PathHandler
  put(handler: (t: OperationHandler) => void): PathHandler
  post(handler: (t: OperationHandler) => void): PathHandler
  delete(handler: (t: OperationHandler) => void): PathHandler
  options(handler: (t: OperationHandler) => void): PathHandler
  head(handler: (t: OperationHandler) => void): PathHandler
  patch(handler: (t: OperationHandler) => void): PathHandler
  trace(handler: (t: OperationHandler) => void): PathHandler

  summary(summary: string): PathHandler
  describe(description: string): PathHandler

  parameter(ref: ReferenceObject): void
  parameter<T extends ParameterLocation>(
    name: string,
    location: T,
    options: ParameterOptions[T] & ParameterObjectWithSchema
  ): void
  // parameter: {
  //   (ref: ReferenceObject): void
  //   <T extends ParameterLocation>(
  //     name: string,
  //     location: T,
  //     options: ParameterOptions[T] & ParameterObjectWithSchema
  //   ): void
  // }
}

interface OperationHandler {
  tags(tags: string | string[]): void
  summary(summary: string): void
  describe(description: string): void
  externalDoc(url: string, description?: string): void

  parameter(ref: ReferenceObject): void
  parameter<T extends ParameterLocation>(
    name: string,
    location: T,
    options: ParameterOptions[T] & ParameterObjectWithSchema
  ): void
  // parameter: {
  //   (ref: ReferenceObject): void
  //   <T extends ParameterLocation>(
  //     name: string,
  //     location: T,
  //     options: ParameterOptions[T] & ParameterObjectWithSchema
  //   ): void
  // }
  operationId(id: string): void
  requestBody(handler: (requestBody: RequestBodyContext) => void | ReferenceObject): RequestBodyContext
  response: {
    (status: Status): ResponseContext
    (status: Status, ref: ReferenceObject): ResponseRefContext
  }
  deprecated(): void
  security(name: string | {name: string}, scope?: string[]): void
}

interface RequestBodyContext {
  describe: (description: string) => RequestBodyContext
  required(): RequestBodyContext
  content(contentType: ContentType, schema: Schema): RequestBodyContext
  content(contentType: string, schema: Schema): RequestBodyContext
}

interface ResponseContext {
  describe(description: string): ResponseContext
  content(contentType: ContentType, schema: Schema): ResponseContext
  content(contentType: string, schema: Schema): ResponseContext
}

interface ResponseRefContext {
  describe(description: string): ResponseRefContext
}

const createDoc = (): DocHandler => {
  const doc: OpenApiDoc = {
    openapi: '3.1.1',
    info: {title: 'test', version: '1'},
    paths: {},
    components: {
      schemas: {},
    },
  }

  const addSchema = (name: string, schema: any) => {
    doc.components!.schemas![name] = schema
    return {$ref: `#/components/schemas/${name}`}
  }

  const addPath = (path: string) => {
    const pathItem: PathItemObject = {} as PathItemObject
    doc.paths ??= {}
    doc.paths[path] = pathItem

    const createOperationHandler = (operation: OperationObject): OperationHandler => {
      return new Proxy({} as OperationHandler, {
        get: (_, prop) => {
          if (prop === 'describe') {
            return (description: string) => {
              operation.description = description
              return createOperationHandler(operation)
            }
          }
          if (prop === 'summary') {
            return (summary: string) => {
              operation.summary = summary
              return createOperationHandler(operation)
            }
          }
          if (prop === 'response') {
            return (status: Status, refOrContent?: any) => {
              operation.responses ??= {}
              const response = (operation.responses[status] ??= {description: `Response ${status}`, content: {}})

              if (isRef(refOrContent)) {
                response.content = refOrContent
                return createResponseRefHandler(operation, status)
              } else {
                return createResponseHandler(operation, status)
              }
            }
          }
          return () => {}
        },
      })
    }

    const createResponseHandler = (operation: OperationObject, status: Status): ResponseContext => {
      return new Proxy({} as ResponseContext, {
        get: (_, prop) => {
          if (prop === 'content') {
            return (contentType: string, schema: any) => {
              const response = operation.responses[status]
              response.content[contentType] = {schema}
              return createResponseHandler(operation, status)
            }
          }
          if (prop === 'describe') {
            return (description: string) => {
              const response = operation.responses[status]
              response.description = description
              return createResponseHandler(operation, status)
            }
          }
          return () => {}
        },
      })
    }

    const createResponseRefHandler = (operation: OperationObject, status: Status): ResponseRefContext => {
      return new Proxy({} as ResponseRefContext, {
        get: (_, prop) => {
          if (prop === 'describe') {
            return (description: string) => {
              const response = operation.responses[status]
              response.description = description
              return createResponseRefHandler(operation, status)
            }
          }
          return () => {}
        },
      })
    }

    const addOperation = (
      method: 'get' | 'post' | 'put' | 'delete' | 'patch',
      handler: (t: OperationHandler) => void
    ) => {
      const operation: OperationObject = {} as OperationObject
      pathItem[method] = operation

      handler(createOperationHandler(operation))
    }

    return {
      get: (handler: (t: OperationHandler) => void) => addOperation('get', handler),
      post: (handler: (t: OperationHandler) => void) => addOperation('post', handler),
      put: (handler: (t: OperationHandler) => void) => addOperation('put', handler),
      delete: (handler: (t: OperationHandler) => void) => addOperation('delete', handler),
      patch: (handler: (t: OperationHandler) => void) => addOperation('patch', handler),
    }
  }

  return {
    addPath,
    addSchema,

    toYAML: (options?: YAML.StringifyOptions) => YAML.stringify(doc, options),
  }
}

// TEST
const doc = createDoc()

doc //
  .addPath('/users')
  .get((t) => {
    t.requestBody((t) => {})
    t.parameter('id', 'query', {schema: {type: 'string', default: '1'}})
  })

const UserRef = doc.addSchema('User', {
  type: 'object',
  properties: {
    name: {type: 'string'},
  },
})

doc.addPath('/users').get((t) => {
  t.response(200).content('application/json', UserRef)
  t.response(404)
    .describe('Not Found')
    .content('application/json', {
      type: 'object',
      properties: {
        message: {type: 'string'},
      },
    })
})

setTimeout(() => console.log(doc.toYAML()))
