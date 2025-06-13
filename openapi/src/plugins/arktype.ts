import { type } from 'npm:arktype@2.1.20'
import { entriesToRecord } from '../lib/helpers.ts'
import type { SchemaPlugin } from '../types.ts'

export const arktypePlugin = (): SchemaPlugin<type> => {
  const registry = new Map<string, type>()

  return {
    vendor: type({})['~standard']['vendor'],
    registry: false,
    addSchema(schema) {
      return {
        resolve() {
          return schema.toJsonSchema()
        },
      }
    },
    addSchemaGlobal(schema, name: string) {
      if (registry.has(name)) {
        throw new Error('Schemas name is already registered')
      }
      registry.set(name, schema)
    },
    getSchemas() {
      const schemas = entriesToRecord(registry, (schema) => {
        // schema.configure({})
        return schema.toJsonSchema()
      })
      return {schemas}
    },
  }
}
