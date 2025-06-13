import z from 'zod/v4'
import type { SchemaPlugin } from '../types.ts'

// https://github.com/colinhacks/zod/commit/72623011510be94e37fdc669e1bdecc983987edb
export const zodPlugin = (): SchemaPlugin<z.ZodType> => {
  const registry = z.registry<z.core.JSONSchemaMeta>()

  return {
    vendor: z.any()['~standard']['vendor'],
    registry: true,
    addSchema(schema) {
      return {
        resolve() {
          return z.toJSONSchema(schema, {
            // metadata: registry,
            // external: {
            //   registry,
            //   defs: {},
            //   uri: (id) => `#/components/schemas/${id}`,
            // } as any,
          })
        },
      }
    },
    addSchemaGlobal(schema, name: string) {
      registry.add(schema, {id: name})
      // registry.add(schema, {id: `#/components/schemas/${name}`})
    },
    getSchemas() {
      return z.toJSONSchema(registry, {
        uri: (id) => `#/components/schemas/${id}`,
      })
    },
  }
}
