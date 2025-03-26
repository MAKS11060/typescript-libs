import {
  ArraySchema,
  BooleanSchema,
  CombinedSchema,
  JsonSchema,
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

  /**
   * Creates a union schema that matches any of the provided schemas.
   * @param schemas - An array of schema generator instances.
   * @returns A new instance of CombinedSchemaGenerator with anyOf set.
   */
  static union(schemas: SchemaGeneratorInstance[]): CombinedSchemaGenerator {
    return this.anyOf(schemas)
  }

  /**
   * Creates a tuple schema that matches an array with specific item schemas.
   * @param items - An array of schema generator instances for each item in the tuple.
   * @returns A new instance of ArraySchemaGenerator with prefixItems set.
   */
  static tuple(items: SchemaGeneratorInstance[]): ArraySchemaGenerator {
    const generator = new ArraySchemaGenerator(items[0])
    generator.schema.prefixItems = items.map((item) => item.toSchema())
    return generator
  }

  /**
   * Creates a literal schema that matches a specific value.
   * @param value - The literal value to match.
   * @returns A new instance of StringSchemaGenerator with const set.
   */
  static literal(value: string): StringSchemaGenerator {
    return new StringSchemaGenerator().const(value)
  }

  /**
   * Creates an enum schema that matches any of the provided values.
   * @param values - An array of values to match.
   * @returns A new instance of StringSchemaGenerator with enum set.
   */
  static enum(values: string[]): StringSchemaGenerator {
    const generator = new StringSchemaGenerator()
    generator.schema.enum = values
    return generator
  }
}

class StringSchemaGenerator {
  schema: StringSchema = {type: 'string'}
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

  /**
   * Sets a constant value for the string schema.
   * @param value - The constant value.
   * @returns A new instance of StringSchemaGenerator with const set.
   */
  const(value: string): StringSchemaGenerator {
    const clone = this.clone()
    clone.schema.const = value
    return clone
  }

  /**
   * Sets an enum for the string schema.
   * @param values - The enum values.
   * @returns A new instance of StringSchemaGenerator with enum set.
   */
  enum(values: string[]): StringSchemaGenerator {
    const clone = this.clone()
    clone.schema.enum = values
    return clone
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
  readonly schema: ArraySchema
  private readonly items: SchemaGeneratorInstance

  constructor(items: SchemaGeneratorInstance) {
    this.items = items
    this.schema = {type: 'array', items: items.toSchema()}
  }

  /**
   * Sets the minimum number of items in the array.
   * @param minItems - The minimum number of items.
   * @returns A new instance of ArraySchemaGenerator with minItems set.
   */
  min(minItems: number): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.minItems = minItems
    return clone
  }

  /**
   * Sets the maximum number of items in the array.
   * @param maxItems - The maximum number of items.
   * @returns A new instance of ArraySchemaGenerator with maxItems set.
   */
  max(maxItems: number): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.maxItems = maxItems
    return clone
  }

  /**
   * Sets whether all items in the array must be unique.
   * @param unique - The flag indicating if items should be unique.
   * @returns A new instance of ArraySchemaGenerator with uniqueItems set.
   */
  uniqueItems(unique: boolean): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.uniqueItems = unique
    return clone
  }

  /**
   * Sets the schema that the array must contain.
   * @param containsSchema - The schema that the array must contain.
   * @returns A new instance of ArraySchemaGenerator with contains set.
   */
  contains(containsSchema: SchemaGeneratorInstance): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.contains = containsSchema.toSchema()
    return clone
  }

  /**
   * Sets the minimum number of items that match the contains schema.
   * @param minContains - The minimum number of matching items.
   * @returns A new instance of ArraySchemaGenerator with minContains set.
   */
  minContains(minContains: number): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.minContains = minContains
    return clone
  }

  /**
   * Sets the maximum number of items that match the contains schema.
   * @param maxContains - The maximum number of matching items.
   * @returns A new instance of ArraySchemaGenerator with maxContains set.
   */
  maxContains(maxContains: number): ArraySchemaGenerator {
    const clone = this.clone()
    clone.schema.maxContains = maxContains
    return clone
  }

  /**
   * Sets the prefix items for the tuple schema.
   * @param prefixItems - The prefix items for the tuple.
   */
  prefixItems(prefixItems: JsonSchema[]) {
    this.schema.prefixItems = prefixItems
  }

  toSchema(): ArraySchema {
    return {...this.schema}
  }

  private clone(): ArraySchemaGenerator {
    const clone = new ArraySchemaGenerator(this.items)
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
