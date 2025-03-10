#!/usr/bin/env -S deno run -A --watch-hmr

import {SchemaObject} from 'npm:openapi3-ts/oas31'

const is30 = (ver: string): ver is '3.0' => ver.startsWith('3.0')
const is31 = (ver: string): ver is '3.1' => ver.startsWith('3.1')

// Базовый класс для всех типов
abstract class BaseSchema<T extends SchemaObject> {
  protected schema: T
  protected fieldName?: string // Имя текущего поля

  constructor(schema: T, fieldName?: string) {
    this.schema = schema
    this.fieldName = fieldName
  }

  // Метод для получения имени текущего поля
  protected getCurrentFieldName(): string | undefined {
    console.log(this.fieldName)
    return this.fieldName
  }

  // Метод для добавления nullable
  nullable(): BaseSchema<T> {
    if (!Array.isArray(this.schema.type)) {
      this.schema.type = [this.schema.type!]
    }
    if (!this.schema.type.includes('null')) {
      this.schema.type.push('null')
    }
    return this
  }

  // Получить финальную схему
  getSchema(): T {
    return this.schema
  }
}

// Класс для строк
class StringSchema extends BaseSchema<SchemaObject> {
  constructor(fieldName?: string) {
    super({type: 'string'}, fieldName)
  }

  min(length: number): this {
    this.schema.minLength = length
    return this
  }

  max(length: number): this {
    this.schema.maxLength = length
    return this
  }

  optional(): this {
    // Убедимся, что this.schema.required существует и является массивом
    if (Array.isArray(this.schema.required)) {
      // Удаляем текущее поле из массива required
      this.schema.required = this.schema.required.filter((field) => field !== this.getCurrentFieldName())
    }
    return this
  }
}

// Класс для чисел
class NumberSchema extends BaseSchema<SchemaObject> {
  constructor(type: 'number' | 'integer' = 'number') {
    super({type})
  }

  min(value: number): this {
    this.schema.minimum = value
    return this
  }

  max(value: number): this {
    this.schema.maximum = value
    return this
  }

  optional(): this {
    // Убедимся, что this.schema.required существует и является массивом
    if (Array.isArray(this.schema.required)) {
      // Удаляем текущее поле из массива required
      this.schema.required = this.schema.required.filter((field) => field !== this.getCurrentFieldName())
    }
    return this
  }
}

// Класс для массивов
class ArraySchema extends BaseSchema<SchemaObject> {
  constructor(items: BaseSchema<any>) {
    super({type: 'array', items: items.getSchema()})
  }

  optional(): this {
    // Убедимся, что this.schema.required существует и является массивом
    if (Array.isArray(this.schema.required)) {
      // Удаляем текущее поле из массива required
      this.schema.required = this.schema.required.filter((field) => field !== this.getCurrentFieldName())
    }
    return this
  }
}

// Класс для объектов
class ObjectSchema extends BaseSchema<SchemaObject> {
  private requiredFields: Set<string> = new Set()

  constructor(shape?: Record<string, BaseSchema<any>>) {
    super({type: 'object', properties: {}, required: []})

    if (shape) {
      this.object(shape)
    }
  }

  object(shape: Record<string, BaseSchema<any>>): this {
    this.schema.properties = {}
    this.requiredFields.clear()

    for (const [key, value] of Object.entries(shape)) {
      this.schema.properties[key] = value.getSchema()
      if (value.schema.required !== false) {
        this.requiredFields.add(key)
      }
    }

    this.schema.required = Array.from(this.requiredFields)
    return this
  }
}

// Класс для enum
class EnumSchema extends BaseSchema<SchemaObject> {
  constructor(values: (string | number)[], type: 'string' | 'number' = 'string') {
    super({
      type,
      enum: values,
    })
  }
}

// Фабричные функции
export const o = {
  string: () => new StringSchema(),
  number: () => new NumberSchema('number'),
  integer: () => new NumberSchema('integer'),
  array: (items: BaseSchema<any>) => new ArraySchema(items),
  object: (shape?: Record<string, BaseSchema<any>>) => new ObjectSchema(shape),
  enum: (values: (string | number)[], type: 'string' | 'number' = 'string') => new EnumSchema(values, type),
}
