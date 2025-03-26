import {
  ArraySchema,
  BooleanSchema,
  CombinedSchema,
  NullSchema,
  NumberSchema,
  ObjectSchema,
  StringSchema,
} from './json-schema.ts'

export {SchemaGenerator as o}

type SchemaGeneratorInstance =
  | StringSchemaGenerator
  | NumberSchemaGenerator
  | BooleanSchemaGenerator
  | ObjectSchemaGenerator
  | ArraySchemaGenerator
  | NullSchemaGenerator
  | CombinedSchemaGenerator

class SchemaGenerator {
  static string(): StringSchemaGenerator {
    return new StringSchemaGenerator()
  }

  static number(): NumberSchemaGenerator {
    return new NumberSchemaGenerator()
  }

  static boolean(): BooleanSchemaGenerator {
    return new BooleanSchemaGenerator()
  }

  static object(properties: Record<string, SchemaGeneratorInstance>): ObjectSchemaGenerator {
    return new ObjectSchemaGenerator(properties)
  }

  static array(items: SchemaGeneratorInstance): ArraySchemaGenerator {
    return new ArraySchemaGenerator(items)
  }

  static null(): NullSchemaGenerator {
    return new NullSchemaGenerator()
  }

  static anyOf(schemas: SchemaGeneratorInstance[]): CombinedSchemaGenerator {
    return new CombinedSchemaGenerator('anyOf', schemas)
  }

  static oneOf(schemas: SchemaGeneratorInstance[]): CombinedSchemaGenerator {
    return new CombinedSchemaGenerator('oneOf', schemas)
  }

  static allOf(schemas: SchemaGeneratorInstance[]): CombinedSchemaGenerator {
    return new CombinedSchemaGenerator('allOf', schemas)
  }

  static not(schema: SchemaGeneratorInstance): CombinedSchemaGenerator {
    return new CombinedSchemaGenerator('not', [schema])
  }
}

class StringSchemaGenerator {
  private readonly schema: StringSchema = {type: 'string'}
  private readonly isRequired: boolean

  constructor(isRequired: boolean = true) {
    this.isRequired = isRequired
  }

  min(length: number): StringSchemaGenerator {
    const clone = this.clone()
    clone.schema.minLength = length
    return clone
  }

  max(length: number): StringSchemaGenerator {
    const clone = this.clone()
    clone.schema.maxLength = length
    return clone
  }

  pattern(regex: string): StringSchemaGenerator {
    const clone = this.clone()
    clone.schema.pattern = regex
    return clone
  }

  optional(): StringSchemaGenerator {
    return this.clone(false)
  }

  toSchema(): StringSchema {
    return {...this.schema}
  }

  isRequiredField(): boolean {
    return this.isRequired
  }

  private clone(isRequired: boolean = this.isRequired): StringSchemaGenerator {
    const clone = new StringSchemaGenerator(isRequired)
    Object.assign(clone.schema, this.schema)
    return clone
  }
}

class NumberSchemaGenerator {
  private readonly schema: NumberSchema = {type: 'number'}
  private readonly isRequired: boolean

  constructor(isRequired: boolean = true) {
    this.isRequired = isRequired
  }

  min(value: number): NumberSchemaGenerator {
    const clone = this.clone()
    clone.schema.minimum = value
    return clone
  }

  max(value: number): NumberSchemaGenerator {
    const clone = this.clone()
    clone.schema.maximum = value
    return clone
  }

  optional(): NumberSchemaGenerator {
    return this.clone(false)
  }

  toSchema(): NumberSchema {
    return {...this.schema}
  }

  isRequiredField(): boolean {
    return this.isRequired
  }

  private clone(isRequired: boolean = this.isRequired): NumberSchemaGenerator {
    const clone = new NumberSchemaGenerator(isRequired)
    Object.assign(clone.schema, this.schema)
    return clone
  }
}

class BooleanSchemaGenerator {
  private readonly schema: BooleanSchema = {type: 'boolean'}
  private readonly isRequired: boolean

  constructor(isRequired: boolean = true) {
    this.isRequired = isRequired
  }

  optional(): BooleanSchemaGenerator {
    return this.clone(false)
  }

  toSchema(): BooleanSchema {
    return {...this.schema}
  }

  isRequiredField(): boolean {
    return this.isRequired
  }

  private clone(isRequired: boolean = this.isRequired): BooleanSchemaGenerator {
    const clone = new BooleanSchemaGenerator(isRequired)
    Object.assign(clone.schema, this.schema)
    return clone
  }
}

class ObjectSchemaGenerator {
  private readonly schema: ObjectSchema
  private readonly isRequired: boolean

  constructor(properties: Record<string, SchemaGeneratorInstance>, isRequired: boolean = true) {
    this.isRequired = isRequired
    this.schema = {
      type: 'object',
      properties: Object.fromEntries(Object.entries(properties).map(([key, generator]) => [key, generator.toSchema()])),
    }
    this.schema.required = Object.keys(properties).filter((key) => {
      const propertySchema = properties[key]
      return 'isRequiredField' in propertySchema && propertySchema.isRequiredField()
    })
  }

  toSchema(): ObjectSchema {
    return {...this.schema, properties: {...this.schema.properties}}
  }

  isRequiredField(): boolean {
    return this.isRequired
  }

  optional(): ObjectSchemaGenerator {
    return this.clone(false)
  }

  private clone(isRequired: boolean = this.isRequired): ObjectSchemaGenerator {
    const clone = new ObjectSchemaGenerator({}, isRequired)
    clone.schema.properties = this.schema.properties
    clone.schema.required = [...(this.schema.required ?? [])]
    return clone
  }
}

class ArraySchemaGenerator {
  private readonly schema: ArraySchema

  constructor(items: SchemaGeneratorInstance) {
    // this.schema = {type: 'array', items: items.toSchema()}
    console.log(items)
    this.schema = {type: 'array', }
  }

  min(minItems: number): ArraySchemaGenerator {
    const clone = this.clone()
    console.log(clone)
    clone.schema.minItems = minItems
    return clone
  }

  max(maxItems: number): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.maxItems = maxItems
    return clone
  }

  toSchema(): ArraySchema {
    return {...this.schema}
  }

  private clone(): ArraySchemaGenerator {
    const clone = new ArraySchemaGenerator(this.schema.items as SchemaGeneratorInstance)
    Object.assign(clone.schema, this.schema)
    return clone
  }
}

class NullSchemaGenerator {
  private readonly schema: NullSchema = {type: 'null'}
  private readonly isRequired: boolean

  constructor(isRequired: boolean = true) {
    this.isRequired = isRequired
  }

  optional(): NullSchemaGenerator {
    return this.clone(false)
  }

  toSchema(): NullSchema {
    return {...this.schema}
  }

  isRequiredField(): boolean {
    return this.isRequired
  }

  private clone(isRequired: boolean = this.isRequired): NullSchemaGenerator {
    const clone = new NullSchemaGenerator(isRequired)
    Object.assign(clone.schema, this.schema)
    return clone
  }
}

class CombinedSchemaGenerator {
  private readonly schema: CombinedSchema

  constructor(type: 'anyOf' | 'oneOf' | 'allOf' | 'not', schemas: SchemaGeneratorInstance[]) {
    this.schema = {[type]: schemas.map((s) => s.toSchema())}
  }

  toSchema(): CombinedSchema {
    return {...this.schema}
  }
}
