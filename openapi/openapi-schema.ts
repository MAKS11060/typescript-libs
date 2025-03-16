#!/usr/bin/env -S deno run -A --watch-hmr

import {ReferenceObject, SchemaObject, SchemaObjectType} from 'npm:openapi3-ts/oas31'

export class SchemaBuilder {
  schema: SchemaObject
  isOptional: boolean

  constructor(type: SchemaObjectType | SchemaObjectType[]) {
    this.schema = {type}
    this.isOptional = false
  }

  min(value: number): this {
    if (this.schema.type === 'integer' || this.schema.type === 'number') {
      this.schema.minimum = value
    } else if (this.schema.type === 'string') {
      this.schema.minLength = value
    }
    return this
  }

  max(value: number): this {
    if (this.schema.type === 'integer' || this.schema.type === 'number') {
      this.schema.maximum = value
    } else if (this.schema.type === 'string') {
      this.schema.maxLength = value
    }
    return this
  }

  nullable(): this {
    if (Array.isArray(this.schema.type)) {
      if (!this.schema.type.includes('null')) {
        this.schema.type.push('null')
      }
    } else {
      this.schema.type = [this.schema.type, 'null'] as SchemaObjectType[]
    }
    return this
  }

  optional(): this {
    this.isOptional = true
    return this
  }

  pattern(regex: string): this {
    if (this.schema.type === 'string') {
      this.schema.pattern = regex
    }
    return this
  }

  multipleOf(value: number): this {
    if (this.schema.type === 'integer' || this.schema.type === 'number') {
      this.schema.multipleOf = value
    }
    return this
  }

  uniqueItems(): this {
    if (this.schema.type === 'array') {
      this.schema.uniqueItems = true
    }
    return this
  }

  enum(values: string[] | number[]): this {
    this.schema.enum = values
    return this
  }

  const(value: string | number): this {
    this.schema.const = value
    return this
  }

  format(format: string): this {
    this.schema.format = format
    return this
  }

  example(value: string | number): this {
    if (this.schema.examples) throw new Error("The 'example' and 'examples' properties are mutually exclusive")
    this.schema.example = value
    return this
  }

  examples(values: any[]): this {
    if (this.schema.example) throw new Error("The 'examples' and 'example' properties are mutually exclusive")
    this.schema.examples = values
    return this
  }

  deprecated(): this {
    this.schema.deprecated = true
    return this
  }

  default(value: any): this {
    this.schema.default = value // Установка значения по умолчанию
    return this
  }

  allOf(...schemas: (SchemaBuilder | SchemaObject | {$ref: string})[]): this {
    this.schema.allOf = schemas.map((s) => (s instanceof SchemaBuilder ? s.toSchema() : s))
    return this
  }

  anyOf(...schemas: (SchemaBuilder | SchemaObject | {$ref: string})[]): this {
    this.schema.anyOf = schemas.map((s) => (s instanceof SchemaBuilder ? s.toSchema() : s))
    return this
  }

  oneOf(...schemas: (SchemaBuilder | SchemaObject | {$ref: string})[]): this {
    this.schema.oneOf = schemas.map((s) => (s instanceof SchemaBuilder ? s.toSchema() : s))
    return this
  }

  not(schema: SchemaBuilder | SchemaObject | {$ref: string}): this {
    this.schema.not = schema instanceof SchemaBuilder ? schema.toSchema() : schema
    return this
  }

  // Дополнительные свойства
  additionalProperties(value: boolean | SchemaBuilder | SchemaObject | {$ref: string}): this {
    if (value instanceof SchemaBuilder) {
      this.schema.additionalProperties = value.toSchema()
    } else {
      this.schema.additionalProperties = value
    }
    return this
  }

  propertyNames(schema: SchemaBuilder | SchemaObject | {$ref: string}): this {
    this.schema.propertyNames = schema instanceof SchemaBuilder ? schema.toSchema() : schema
    return this
  }

  minProperties(value: number): this {
    this.schema.minProperties = value
    return this
  }

  maxProperties(value: number): this {
    this.schema.maxProperties = value
    return this
  }

  items(itemSchema: SchemaBuilder | SchemaObject | {$ref: string}): this {
    if ('$ref' in itemSchema) {
      this.schema.items = itemSchema // Прямая передача $ref
    } else {
      this.schema.items = itemSchema instanceof SchemaBuilder ? itemSchema.toSchema() : itemSchema
    }
    return this
  }

  toSchema(): SchemaObject {
    return this.schema
  }

  isRequired(): boolean {
    return !this.isOptional
  }
}

export const o = {
  object: (properties: Record<string, SchemaBuilder | SchemaObject | {$ref: string}>): SchemaBuilder => {
    const required = Object.entries(properties)
      .filter(([, value]) => (value instanceof SchemaBuilder ? value.isRequired() : false))
      .map(([key]) => key)
    const schema: SchemaObject = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [
          key,
          value instanceof SchemaBuilder ? value.toSchema() : value,
        ])
      ),
      ...(required.length && {required}),
    }
    const builder = new SchemaBuilder('object')
    builder.schema = schema
    return builder
  },

  integer: (): SchemaBuilder => new SchemaBuilder('integer'),
  number: (): SchemaBuilder => new SchemaBuilder('number'),
  string: (): SchemaBuilder => new SchemaBuilder('string'),
  boolean: (): SchemaBuilder => new SchemaBuilder('boolean'),
  null: (): SchemaBuilder => new SchemaBuilder('null'),
  array: (itemSchema: SchemaBuilder | SchemaObject | ReferenceObject): SchemaBuilder =>
    new SchemaBuilder('array').items(
      itemSchema instanceof SchemaBuilder || '$ref' in itemSchema ? itemSchema : new SchemaBuilder('null')
    ),
  enum: (values: string[] | number[]): SchemaBuilder => new SchemaBuilder('string').enum(values),
}
