#!/usr/bin/env -S deno test -A --watch

import { expect } from 'jsr:@std/expect/expect'
import z from 'zod'
import '../../../debug/yaml.ts'
import { zodPlugin } from './zod.ts'

Deno.test('zodPlugin()', async (t) => {
  const plugin = zodPlugin()

  const ID = z.int().positive()
  const user = z.object({
    id: ID,
    username: z.string(),
    get friend() {
      return user
    },
  })

  const schema1 = z.string().transform((v) => v.length).pipe(z.number())
  const schema2 = schema1.transform((len) => len > 5).pipe(z.boolean())
  const schema3 = z.object({
    schema1,
    schema2,
    user,
  })

  plugin.addSchemaGlobal(ID, 'ID')
  plugin.addSchemaGlobal(user, 'User')

  expect(plugin.getSchemas().schemas).toEqual({
    ID: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      exclusiveMinimum: 0,
      maximum: 9007199254740991,
      type: 'integer',
    },
    User: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      additionalProperties: false,
      properties: {
        id: {$ref: '#/components/schemas/ID'},
        username: {type: 'string'},
        friend: {$ref: '#/components/schemas/User'},
      },
      required: ['id', 'username', 'friend'],
      type: 'object',
    },
  })

  expect(plugin.addSchema(ID).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'integer',
    exclusiveMinimum: 0,
    maximum: 9007199254740991,
  })

  // console.log(plugin.addSchema(user).resolve())
  expect(plugin.addSchema(user).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      id: {$ref: '#/components/schemas/ID'},
      username: {type: 'string'},
      friend: {$ref: '#/components/schemas/User'},
    },
    required: ['id', 'username', 'friend'],
    additionalProperties: false,
  })

  //
  plugin.addSchemaGlobal(schema1, 'schema1')
  plugin.addSchemaGlobal(schema2, 'schema2')
  plugin.addSchemaGlobal(schema3, 'schema3')

  // console.log(plugin.addSchema(schema3).resolve())
  expect(plugin.addSchema(schema3).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      schema1: {$ref: '#/components/schemas/schema1'},
      schema2: {$ref: '#/components/schemas/schema2'},
      user: {$ref: '#/components/schemas/User'},
    },
    required: ['schema1', 'schema2', 'user'],
    additionalProperties: false,
  })

  console.log(plugin.getSchemas().schemas)
})

Deno.test('zodPlugin() io', async (t) => {
  const plugin = zodPlugin()

  const email = z.email()
  const emailOrUsername = z.string().transform((v: string) => {
    return email.safeParse(v).success //
      ? ({type: 'email', value: v} as const)
      : ({type: 'username', value: v} as const)
  }).pipe(z.discriminatedUnion('type', [
    z.object({type: z.literal('email'), value: email}),
    z.object({type: z.literal('username'), value: z.string()}),
  ]))

  const loginSchema = z.object({
    login: emailOrUsername,
    password: z.string(),
  })

  // plugin.addSchema(loginSchema, {io: 'input'})
  // plugin.addSchemaGlobal(loginSchema, 'loginSchema')
  // plugin.addSchemaGlobal(z.number().pipe(z.coerce.string()), 'test1')

  // console.log(plugin.getSchemas().schemas)

  // expect(plugin.getSchemas()).toEqual()
})

Deno.test('zodPlugin() global io output (default)', async (t) => {
  const plugin = zodPlugin({})

  const schema1 = z.number().pipe(z.coerce.string())
  expect(plugin.addSchema(schema1, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'number',
  })
  expect(plugin.addSchema(schema1, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'string',
  })

  const schema2 = z.object({schema1})
  expect(plugin.addSchema(schema2, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'number'}},
    required: ['schema1'],
  })
  expect(plugin.addSchema(schema2, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'string'}},
    required: ['schema1'],
    additionalProperties: false,
  })

  const schema3 = schema2.pipe(z.transform((v) => v.schema1.length)).pipe(z.number())
  expect(plugin.addSchema(schema3, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'number'}},
    required: ['schema1'],
  })
  expect(plugin.addSchema(schema3, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'number',
  })

  //
  plugin.addSchemaGlobal(schema1, 'schema1')
  plugin.addSchemaGlobal(schema2, 'schema2')
  plugin.addSchemaGlobal(schema3, 'schema3')

  expect(plugin.getSchemas().schemas).toEqual({
    schema1: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'string',
    },
    schema2: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {schema1: {$ref: '#/components/schemas/schema1'}},
      required: ['schema1'],
      additionalProperties: false,
    },
    schema3: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'number',
    },
  })
})

Deno.test('zodPlugin() global io input', async (t) => {
  const plugin = zodPlugin({io: 'input'})

  const schema1 = z.number().pipe(z.coerce.string())
  expect(plugin.addSchema(schema1, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'number',
  })
  expect(plugin.addSchema(schema1, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'string',
  })

  const schema2 = z.object({schema1})
  expect(plugin.addSchema(schema2, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'number'}},
    required: ['schema1'],
  })
  expect(plugin.addSchema(schema2, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'string'}},
    required: ['schema1'],
    additionalProperties: false,
  })

  const schema3 = schema2.pipe(z.transform((v) => v.schema1.length)).pipe(z.number())
  expect(plugin.addSchema(schema3, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'number'}},
    required: ['schema1'],
  })
  expect(plugin.addSchema(schema3, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'number',
  })

  //
  plugin.addSchemaGlobal(schema1, 'schema1')
  plugin.addSchemaGlobal(schema2, 'schema2')
  plugin.addSchemaGlobal(schema3, 'schema3')

  // console.log(plugin.getSchemas().schemas)
  expect(plugin.getSchemas().schemas).toEqual({
    schema1: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'number',
    },
    schema2: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {schema1: {$ref: '#/components/schemas/schema1'}},
      required: ['schema1'],
    },
    schema3: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $ref: '#/components/schemas/schema2',
    },
  })
})

Deno.test('zodPlugin() global io mixed 1', async (t) => {
  const plugin = zodPlugin()

  const schema1 = z.number().pipe(z.coerce.string())
  const schema2 = z.object({schema1, schema2: schema1.optional()})
  const schema3 = schema2.pipe(z.transform((v) => v.schema1.length)).pipe(z.number())

  //
  plugin.addSchemaGlobal(schema1, 'schema1', {io: 'input'})
  plugin.addSchemaGlobal(schema2, 'schema2')
  plugin.addSchemaGlobal(schema3, 'schema3', {io: 'input'})

  console.log(plugin.getSchemas().schemas)
  expect(plugin.getSchemas().schemas).toEqual({
    schema2: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {schema1: {type: 'string'}, schema2: {type: 'string'}},
      required: ['schema1'],
      additionalProperties: false,
    },
    schema1: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'number',
    },
    schema3: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        schema1: {$ref: '#/components/schemas/schema1'},
        schema2: {$ref: '#/components/schemas/schema1'},
      },
      required: ['schema1'],
    },
  })
})

Deno.test('zodPlugin() global io mixed 2', async (t) => {
  const plugin = zodPlugin()

  const schema1 = z.string().transform((v) => v.length).pipe(z.number())
  const schema2 = schema1.transform((len) => len > 5).pipe(z.boolean())

  //
  plugin.addSchemaGlobal(schema1, 'schema1')
  plugin.addSchemaGlobal(schema1, 'schema1input', {io: 'input'})
  plugin.addSchemaGlobal(schema2, 'schema2')
  plugin.addSchemaGlobal(schema2, 'schema2input', {io: 'input'})

  // console.log(plugin.getSchemas().schemas)
  expect(plugin.getSchemas().schemas).toEqual({
    schema1: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'number',
    },
    schema1input: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'string',
    },
    schema2: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'boolean',
    },
    schema2input: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $ref: '#/components/schemas/schema1input',
    },
  })
})

Deno.test('zodPlugin() global io mixed 3', async (t) => {
  const plugin = zodPlugin()

  const email = z.email()
  const emailOrUsername = z.string().transform((v: string) => {
    return email.safeParse(v).success //
      ? ({type: 'email', value: v} as const)
      : ({type: 'username', value: v} as const)
  }).pipe(z.discriminatedUnion('type', [
    z.object({type: z.literal('email'), value: email}),
    z.object({type: z.literal('username'), value: z.string()}),
  ]))

  const loginUser = z.object({
    login: emailOrUsername,
    password: z.string(),
  })

  //
  plugin.addSchemaGlobal(emailOrUsername, 'emailOrUsername', {io: 'input'})
  plugin.addSchemaGlobal(loginUser, 'loginUser')
  plugin.addSchemaGlobal(loginUser, 'loginUserInput', {io: 'input'})

  // console.log(JSON.stringify(plugin.getSchemas().schemas))
  expect(plugin.getSchemas().schemas).toEqual({
    loginUser: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        login: {
          anyOf: [{
            type: 'object',
            properties: {
              type: {type: 'string', const: 'email'},
              value: {
                type: 'string',
                format: 'email',
                pattern:
                  "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
              },
            },
            required: ['type', 'value'],
            additionalProperties: false,
          }, {
            type: 'object',
            properties: {type: {type: 'string', const: 'username'}, value: {type: 'string'}},
            required: ['type', 'value'],
            additionalProperties: false,
          }],
        },
        password: {type: 'string'},
      },
      required: ['login', 'password'],
      additionalProperties: false,
    },
    emailOrUsername: {$schema: 'https://json-schema.org/draft/2020-12/schema', type: 'string'},
    loginUserInput: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {login: {$ref: '#/components/schemas/emailOrUsername'}, password: {type: 'string'}},
      required: ['login', 'password'],
    },
  })
})

Deno.test('zodPlugin() global io mixed 4', async (t) => {
  const plugin = zodPlugin()

  const schema1 = z.string().transform((v) => v.length).pipe(z.number())
  const schema2 = schema1.transform((len) => len > 5).pipe(z.boolean())
  const schema3 = z.object({schema1, schema2})

  //
  plugin.addSchemaGlobal(schema1, 'schema1')
  plugin.addSchemaGlobal(schema2, 'schema2')
  plugin.addSchemaGlobal(schema3, 'schema3')

  console.log(plugin.addSchema(schema1, {io: 'input'}).resolve())
  console.log(plugin.addSchema(schema2, {io: 'input'}).resolve())
  console.log(plugin.addSchema(schema3, {io: 'input'}).resolve())

  // console.log(plugin.getSchemas().schemas)
  expect(plugin.getSchemas().schemas).toEqual({
    schema1: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'number',
    },
    schema2: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'boolean',
    },
    schema3: {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        schema1: {$ref: '#/components/schemas/schema1'},
        schema2: {$ref: '#/components/schemas/schema2'},
      },
      required: ['schema1', 'schema2'],
      additionalProperties: false,
    },
  })

  expect(plugin.addSchema(schema1, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'string',
  })
  expect(plugin.addSchema(schema2, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'string',
  })
  expect(plugin.addSchema(schema3, {io: 'input'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {schema1: {type: 'string'}, schema2: {type: 'string'}},
    required: ['schema1', 'schema2'],
  })

  expect(plugin.addSchema(schema1, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'number',
  })
  expect(plugin.addSchema(schema2, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'boolean',
  })
  expect(plugin.addSchema(schema3, {io: 'output'}).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    properties: {
      schema1: {$ref: '#/components/schemas/schema1'},
      schema2: {$ref: '#/components/schemas/schema2'},
    },
    required: ['schema1', 'schema2'],
    additionalProperties: false,
  })
})
