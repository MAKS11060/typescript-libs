#!/usr/bin/env -S deno run -A --watch-hmr

import {SchemaObject, SchemaObjectType} from 'npm:openapi3-ts/oas31'

class SchemaBuilder {
  private schema: SchemaObject;
  private isOptional: boolean;

  constructor(type: SchemaObjectType | SchemaObjectType[]) {
    this.schema = { type };
    this.isOptional = false;
  }

  // Основные методы
  min(value: number): this {
    if (this.schema.type === "integer" || this.schema.type === "number") {
      this.schema.minimum = value;
    } else if (this.schema.type === "string") {
      this.schema.minLength = value;
    }
    return this;
  }

  max(value: number): this {
    if (this.schema.type === "integer" || this.schema.type === "number") {
      this.schema.maximum = value;
    } else if (this.schema.type === "string") {
      this.schema.maxLength = value;
    }
    return this;
  }

  nullable(): this {
    if (Array.isArray(this.schema.type)) {
      if (!this.schema.type.includes("null")) {
        this.schema.type.push("null");
      }
    } else {
      this.schema.type = [this.schema.type, "null"] as SchemaObjectType[];
    }
    return this;
  }

  optional(): this {
    this.isOptional = true;
    return this;
  }

  pattern(regex: string): this {
    if (this.schema.type === "string") {
      this.schema.pattern = regex;
    }
    return this;
  }

  multipleOf(value: number): this {
    if (this.schema.type === "integer" || this.schema.type === "number") {
      this.schema.multipleOf = value;
    }
    return this;
  }

  uniqueItems(): this {
    if (this.schema.type === "array") {
      this.schema.uniqueItems = true;
    }
    return this;
  }

  enum(values: any[]): this {
    this.schema.enum = values;
    return this;
  }

  const(value: any): this {
    this.schema.const = value;
    return this;
  }

  format(format: string): this {
    this.schema.format = format;
    return this;
  }

  example(value: any): this {
    this.schema.example = value;
    return this;
  }

  examples(values: any[]): this {
    this.schema.examples = values;
    return this;
  }

  deprecated(): this {
    this.schema.deprecated = true;
    return this;
  }

  // Композиция схем
  allOf(...schemas: (SchemaBuilder | SchemaObject)[]): this {
    this.schema.allOf = schemas.map((s) =>
      s instanceof SchemaBuilder ? s.toSchema() : s
    );
    return this;
  }

  anyOf(...schemas: (SchemaBuilder | SchemaObject)[]): this {
    this.schema.anyOf = schemas.map((s) =>
      s instanceof SchemaBuilder ? s.toSchema() : s
    );
    return this;
  }

  oneOf(...schemas: (SchemaBuilder | SchemaObject)[]): this {
    this.schema.oneOf = schemas.map((s) =>
      s instanceof SchemaBuilder ? s.toSchema() : s
    );
    return this;
  }

  not(schema: SchemaBuilder | SchemaObject): this {
    this.schema.not = schema instanceof SchemaBuilder ? schema.toSchema() : schema;
    return this;
  }

  // Дополнительные свойства
  additionalProperties(
    value: boolean | SchemaBuilder | SchemaObject
  ): this {
    if (value instanceof SchemaBuilder) {
      this.schema.additionalProperties = value.toSchema();
    } else {
      this.schema.additionalProperties = value;
    }
    return this;
  }

  propertyNames(schema: SchemaBuilder | SchemaObject): this {
    this.schema.propertyNames =
      schema instanceof SchemaBuilder ? schema.toSchema() : schema;
    return this;
  }

  // Ограничение количества свойств
  minProperties(value: number): this {
    this.schema.minProperties = value;
    return this;
  }

  maxProperties(value: number): this {
    this.schema.maxProperties = value;
    return this;
  }

  // Метод для настройки элементов массива
  items(itemSchema: SchemaBuilder | SchemaObject): this {
    this.schema.items =
      itemSchema instanceof SchemaBuilder ? itemSchema.toSchema() : itemSchema;
    return this;
  }

  // Преобразование в объект SchemaObject
  toSchema(): SchemaObject {
    return this.schema;
  }

  isRequired(): boolean {
    return !this.isOptional;
  }
}

const o = {
  object: (
    properties: Record<string, SchemaBuilder | SchemaObject>
  ): SchemaBuilder => {
    const required = Object.entries(properties)
      .filter(
        ([, value]) =>
          value instanceof SchemaBuilder ? value.isRequired() : false
      )
      .map(([key]) => key);
    const schema: SchemaObject = {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [
          key,
          value instanceof SchemaBuilder ? value.toSchema() : value,
        ])
      ),
      required: required.length > 0 ? required : undefined,
    };
    return new SchemaBuilder("object").allOf(schema);
  },

  integer: (): SchemaBuilder => new SchemaBuilder("integer"),
  number: (): SchemaBuilder => new SchemaBuilder("number"),
  string: (): SchemaBuilder => new SchemaBuilder("string"),
  boolean: (): SchemaBuilder => new SchemaBuilder("boolean"),
  null: (): SchemaBuilder => new SchemaBuilder("null"),
  array: (itemSchema: SchemaBuilder | SchemaObject): SchemaBuilder =>
    new SchemaBuilder("array").items(
      itemSchema instanceof SchemaBuilder ? itemSchema : new SchemaBuilder("null")
    ),
  enum: (values: any[]): SchemaBuilder =>
    new SchemaBuilder("string").enum(values),
};

// Пример использования
const UserSchema = o.object({
  id: o.integer().min(1),
  name: o.string().min(3).max(50).optional(),
  age: o.number().min(13).max(100).nullable(),
  tags: o.array(o.string()).optional(),
  isAdmin: o.enum(['true', 'false']),
})

const AccountSchema = o.object({
  user: UserSchema,
  createdAt: o.integer(),
  metadata: o
    .object({})
    .additionalProperties(o.string())
    .minProperties(1)
    .maxProperties(5),
})

// console.log(JSON.stringify(UserSchema, null, 2))
// console.log(UserSchema)
console.log(AccountSchema)
