import z from 'zod'
import type { SchemaPlugin } from '../types.ts'

export const zodPlugin = (): SchemaPlugin<z.ZodType> => {
  const registry = z.registry<z.core.JSONSchemaMeta>()

  return {
    vendor: z.any()['~standard']['vendor'],
    registry: true,
    addSchema(schema) {
      return {
        resolve() {
          const jsonSchema = z.toJSONSchema(schema, {
            metadata: registry,
            override(ctx) {
              // console.log(ctx.zodSchema.def)

              for (const key in ctx.jsonSchema.properties) {
                const prop = ctx.jsonSchema.properties[key] as {$ref?: string}

                if (prop.$ref) {
                  if (prop.$ref.startsWith('#/$defs/')) { // use register store
                    const id = prop.$ref.slice('#/$defs/'.length)
                    prop.$ref = `#/components/schemas/${id}`
                  }

                  if (prop.$ref === '#' && registry.get(schema)?.id) { // self
                    prop.$ref = `#/components/schemas/${registry.get(schema)?.id}`
                  }
                }
              }
            },
          })

          // post processing
          // use global $defs
          const defs = jsonSchema['$defs']
          for (const key in defs) {
            if (registry._idmap.has(key)) delete defs[key]
          }
          if (!Object.keys(defs ?? {}).length) delete jsonSchema['$defs']

          delete jsonSchema.id
          return jsonSchema
        },
      }
    },
    addSchemaGlobal(schema, name: string) {
      registry.add(schema, {id: name})
    },
    getSchemas() {
      const jsonSchemas = z.toJSONSchema(registry, {
        uri: (id) => `#/components/schemas/${id}`,
      })

      for (const key in jsonSchemas.schemas) {
        delete jsonSchemas.schemas[key].$id
      }

      return jsonSchemas
    },
  }
}
