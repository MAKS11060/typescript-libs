import {toJsonSchema, type ConversionConfig} from 'npm:@valibot/to-json-schema'
import * as v from 'npm:valibot'
import {entriesToRecord} from '../lib/helpers.ts'
import type {Plugin} from '../types.ts'

// const toID = (id: string) => `#/components/schemas/${id}`

export const valibotPlugin = (config?: ConversionConfig) => {
  const registry = new Map<
    string,
    v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
  >()

  return {
    vendor: v.any()['~standard']['vendor'],
    registry: false,
    addSchema(schema) {
      return {
        resolve() {
          return toJsonSchema(schema, config)
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
      const schemas = entriesToRecord(registry, (v) => {
        return toJsonSchema(v, config)
      })
      return {schemas}
    },
  } satisfies Plugin<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>
}
