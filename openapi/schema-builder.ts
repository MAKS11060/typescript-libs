#!/usr/bin/env -S deno run -A --watch

import {SchemaObject} from 'openapi3-ts/oas31'

class Schema {
  protected schema: SchemaObject = {}

  describe(description: string): this {
    this.schema.description = description
    return this
  }

  optional(): this {
    this.schema.nullable = true
    return this
  }

  default(value: any): this {
    this.schema.default = value
    return this
  }

  toSchema(): SchemaObject {
    return this.schema
  }
}

class NumberSchema extends Schema {
  constructor() {
    super()
    this.schema.type = 'number'
  }

  int(): this {
    this.schema.type = 'integer'
    return this
  }

  positive(): this {
    this.schema.minimum = 0
    return this
  }
}

class StringSchema extends Schema {
  constructor() {
    super()
    this.schema.type = 'string'
  }
}

class BooleanSchema extends Schema {
  constructor() {
    super()
    this.schema.type = 'boolean'
  }
}

class ArraySchema extends Schema {
  constructor(items: Schema) {
    super()
    this.schema.type = 'array'
    this.schema.items = items.toSchema()
  }
}

class ObjectSchema extends Schema {
  constructor(properties: Record<string, Schema>) {
    super()
    this.schema.type = 'object'
    this.schema.properties = {}
    this.schema.required = []

    for (const [key, value] of Object.entries(properties)) {
      this.schema.properties[key] = value.toSchema()
      if (!value.toSchema().nullable) {
        this.schema.required.push(key)
      }
    }
  }
}

class LiteralSchema extends Schema {
  constructor(value: any) {
    super()
    this.schema.const = value
  }
}

class EnumSchema extends Schema {
  constructor(values: any[]) {
    super()
    this.schema.enum = values
  }
}

const o = {
  number: () => new NumberSchema(),
  string: () => new StringSchema(),
  boolean: () => new BooleanSchema(),
  array: (items: Schema) => new ArraySchema(items),
  object: (properties: Record<string, Schema>) => new ObjectSchema(properties),
  literal: (value: any) => new LiteralSchema(value),
  enum: (values: any[]) => new EnumSchema(values),
  record: (keySchema: Schema, valueSchema: Schema) => {
    const keyType = keySchema.toSchema().type
    if (keyType !== 'string') {
      throw new Error('Record keys must be strings')
    }
    return new ObjectSchema({
      patternProperties: {
        '^.*$': valueSchema.toSchema(), // Все строки соответствуют ключам
      },
      additionalProperties: false,
    })
  },
}

// Пример использования
const schema1 = o.object({
  id: o.number().int().describe('The ID'),
  str: o.string(),
  strOptions: o.string().optional(),
  bool: o.boolean().default(true),
  const: o.literal('1'),
  array: o.array(o.string()),
  record: o.record(o.string(), o.number().positive()),
  enum: o.enum(['a', 'b', 'c']),
})

console.log(JSON.stringify(schema1.toSchema(), null, 2))
