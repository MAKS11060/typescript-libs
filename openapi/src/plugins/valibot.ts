import {toJsonSchema, type ConversionConfig} from 'npm:@valibot/to-json-schema@1.2.0'
import * as v from 'npm:valibot@1.1.0'
import {entriesToRecord} from '../lib/helpers.ts'
import type {SchemaPlugin} from '../types.ts'

export const valibotPlugin = (
  config?: ConversionConfig
): SchemaPlugin<v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>> => {
  const registry = new Map<string, v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>>()

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
  }
}
