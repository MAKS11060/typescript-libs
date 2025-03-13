import {
  ContentObject,
  ExampleObject,
  OpenApiBuilder,
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ParameterStyle,
  ReferenceObject,
  SchemaObject,
} from 'npm:openapi3-ts/oas31'
import {SchemaBuilder} from './openapi-schema.ts'

type ParsePath<T extends string> = T extends `${string}{${infer P}}${infer Rest}` ? P | ParsePath<Rest> : never

class MyOpenApi {
  private builder: OpenApiBuilder

  constructor(doc: OpenAPIObject) {
    this.builder = OpenApiBuilder.create(doc)
  }

  addSchema(name: string, schema: SchemaObject|SchemaBuilder): ReferenceObject {
    this.builder.addSchema(name, schema instanceof SchemaBuilder ? schema.toSchema() : schema)
    return {$ref: `#/components/schemas/${name}`}
  }

  addPath<T extends string>(
    path: T,
    pathItem: {
      params?: {
        [K in ParsePath<T>]: {
          description?: string
          required?: boolean
          deprecated?: boolean
          allowEmptyValue?: boolean
          style?: ParameterStyle
          explode?: boolean
          allowReserved?: boolean
          schema?: SchemaObject | ReferenceObject | SchemaBuilder
          examples?: {
            [param: string]: ExampleObject | ReferenceObject
          }
          example?: any
          content?: ContentObject
        }
      }
    } = {}
  ): PathBuilder {
    const paramNames = path.match(/\{(\w+)\}/g)?.map((m) => m.slice(1, -1)) || []
    const parameters = paramNames.map((name) => {
      const schema = pathItem.params?.[name as ParsePath<T>]?.schema
      return ({
        ...pathItem.params?.[name as ParsePath<T>],
        name,
        in: 'path',
        schema: schema instanceof SchemaBuilder ? schema.toSchema() : schema,
        required: pathItem.params?.[name as ParsePath<T>]?.required ?? true,
        // required: pathItem.params?.[name as ParsePath<T>]?.required ?? true,
        // schema: pathItem.params?.[name as ParsePath<T>]?.schema,
        // description: pathItem.params?.[name as ParsePath<T>]?.description,
        // deprecated: pathItem.params?.[name as ParsePath<T>]?.deprecated,
        // allowEmptyValue: pathItem.params?.[name as ParsePath<T>]?.allowEmptyValue,
        // style: pathItem.params?.[name as ParsePath<T>]?.style,
        // explode: pathItem.params?.[name as ParsePath<T>]?.explode,
        // allowReserved: pathItem.params?.[name as ParsePath<T>]?.allowReserved,
        // example: pathItem.params?.[name as ParsePath<T>]?.example,
        // examples: pathItem.params?.[name as ParsePath<T>]?.examples,
        // content: pathItem.params?.[name as ParsePath<T>]?.content,
      });
    }) satisfies ParameterObject[]

    this.builder.addPath(path, {parameters})

    return new PathBuilder(this.builder, path)
  }

  getDocument(): OpenAPIObject {
    return this.builder.getSpec()
  }

  getDocumentYAML(): string {
    return this.builder.getSpecAsYaml()
  }
}

/**
 * Класс для построения операций внутри пути.
 */
class PathBuilder {
  private builder: OpenApiBuilder
  private path: string

  get!: (operation: Partial<OperationObject>) => OperationBuilder
  post!: (operation: Partial<OperationObject>) => OperationBuilder
  put!: (operation: Partial<OperationObject>) => OperationBuilder
  delete!: (operation: Partial<OperationObject>) => OperationBuilder
  patch!: (operation: Partial<OperationObject>) => OperationBuilder
  head!: (operation: Partial<OperationObject>) => OperationBuilder
  options!: (operation: Partial<OperationObject>) => OperationBuilder

  constructor(builder: OpenApiBuilder, path: string) {
    this.builder = builder
    this.path = path

    const methods = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'] as const
    for (const method of methods) {
      this[method] = (operation: Partial<OperationObject> = {}): OperationBuilder => {
        return new OperationBuilder(this.builder, this.path, 'get', operation)
      }
    }
  }
}

type ContentType = 'application/json' | 'text/plain' | 'text/html'

/**
 * Класс для построения ответов операции.
 */
class OperationBuilder {
  private builder: OpenApiBuilder
  private path: string
  private method: string
  private operation: OperationObject

  constructor(builder: OpenApiBuilder, path: string, method: string, operation: Partial<OperationObject>) {
    this.builder = builder
    this.path = path
    this.method = method
    this.operation = {...operation, responses: operation.responses || {}}
  }

  /**
   * Добавляет ответ.
   * @param statusCode Код статуса HTTP.
   * @param contentType Тип контента (например, `application/json`).
   * @param schema Схема ответа.
   * @returns Экземпляр OperationBuilder для цепочки вызовов.
   */
  response(
    statusCode: number,
    contentType: ContentType,
    schema: SchemaObject | ReferenceObject | SchemaBuilder
  ): OperationBuilder {
    this.operation.responses ??= {}
    this.operation.responses[statusCode] = {
      description: this.operation.responses[statusCode]?.description || `Response ${statusCode}`,
      content: {
        [contentType]: {
          schema: schema instanceof SchemaBuilder ? schema.toSchema() : schema,
        },
      },
    }
    this.builder.addPath(this.path, {
      [this.method]: this.operation,
    })
    return this
  }
}

export const createMyOpenApi = (doc: OpenAPIObject) => new MyOpenApi(doc)
