import {type} from 'npm:arktype'
import {entriesToRecord} from '../lib/helpers.ts'
import type {Plugin} from '../types.ts'

// const toID = (id: string) => `#/components/schemas/${id}`

export const arktypePlugin = () => {
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
        // console.log(schemad)

        schema.configure({})

        return schema.toJsonSchema()
      })
      return {schemas}
    },
  } satisfies Plugin<type>
}
