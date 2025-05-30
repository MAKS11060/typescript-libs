import z from 'zod/v4'
import type {Plugin} from '../types.ts'

export const zodPlugin = () => {
  const registry = z.registry<z.core.JSONSchemaMeta>()

  return {
    vendor: z.any()['~standard']['vendor'],
    registry: true,
    addSchema(schema) {
      return {
        resolve() {
          return z.toJSONSchema(schema, {
            external: {
              registry,
              defs: {},
              uri: (id) => `#/components/schemas/${id}`,
            },
          })
        },
      }
    },
    addSchemaGlobal(schema, name: string) {
      registry.add(schema, {id: name})
    },
    getSchemas() {
      return z.toJSONSchema(registry, {
        uri: (id) => `#/components/schemas/${id}`,
      })
    },
  } satisfies Plugin<z.ZodType>
}
