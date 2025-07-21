import z from 'zod'
import type { SchemaPlugin, SchemaPluginConfig } from '../types.ts'

const componentName = '#/components/schemas'

export const zodPlugin = (config?: SchemaPluginConfig): SchemaPlugin<z.ZodType> => {
  const registry = z.registry<z.core.JSONSchemaMeta>()
  // const ioMode = new WeakMap<WeakKey, 'input' | 'output'>()
  const ioModeGlobal = new Map<string, 'input' | 'output'>()

  return {
    vendor: z.any()['~standard']['vendor'],
    registry: true,
    addSchema(schema, options) {
      // if (options?.io) ioMode.set(schema, options?.io)
      return {
        resolve() {
          const jsonSchema = z.toJSONSchema(schema, {
            io: options?.io,
            metadata: options?.io !== 'input' ? registry : undefined,
            override: (ctx) => {
              for (const key in ctx.jsonSchema.properties) {
                const prop = ctx.jsonSchema.properties[key] as {$ref?: string}

                if (prop.$ref) {
                  if (prop.$ref.startsWith('#/$defs/')) { // use register store
                    const id = prop.$ref.slice('#/$defs/'.length)
                    prop.$ref = `${componentName}/${id}`
                  }

                  if (prop.$ref === '#' && registry.get(schema)?.id) { // self
                    prop.$ref = `${componentName}/${registry.get(schema)?.id}`
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
    addSchemaGlobal(schema, name: string, options) {
      if (options?.io === 'input') ioModeGlobal.set(name, options?.io)
      registry.add(schema, {id: name})
    },
    getSchemas() {
      const jsonSchemas = z.toJSONSchema(registry, {
        uri: (id) => `${componentName}/${id}`,
        io: config?.io ?? 'output',
      })

      for (const key in jsonSchemas.schemas) {
        delete jsonSchemas.schemas[key].$id
      }

      // overwrite using input schema
      if (ioModeGlobal.size) {
        const jsonSchemasInput = z.toJSONSchema(registry, {
          uri: (id) => `${componentName}/${id}`,
          io: 'input',
          reused: 'inline',
        })
        for (const key in jsonSchemas.schemas) {
          delete jsonSchemasInput.schemas[key].$id
        }
        for (const [name] of ioModeGlobal) {
          jsonSchemas.schemas[name] = jsonSchemasInput.schemas[name]
        }
      }

      return jsonSchemas
    },
  }
}
