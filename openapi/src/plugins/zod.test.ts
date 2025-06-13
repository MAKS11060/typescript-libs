#!/usr/bin/env -S deno test -A --watch

import { expect } from 'jsr:@std/expect/expect'
import z from 'zod/v4'
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

  plugin.addSchema(user)

  plugin.addSchemaGlobal(ID, 'ID')
  plugin.addSchemaGlobal(user, 'User')

  expect(plugin.getSchemas()).toEqual({
    schemas: {
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
          friend: {$ref: '#/components/schemas/User'},
          id: {$ref: '#/components/schemas/ID'},
          username: {type: 'string'},
        },
        required: ['id', 'username', 'friend'],
        type: 'object',
      },
    },
  })

  expect(plugin.addSchema(ID).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'integer',
    exclusiveMinimum: 0,
    maximum: 9007199254740991,
  })

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
})
