#!/usr/bin/env -S deno run -A --watch-hmr

import { expect } from 'jsr:@std/expect/expect'
import { type } from 'npm:arktype'
import '../../../debug/yaml.ts'
import { arktypePlugin } from './arktype.ts'

Deno.test('arktypePlugin()', async (t) => {
  const plugin = arktypePlugin()

  const ID = type('number')
  const user = type({
    id: ID,
    username: type('string'),
  })
  const account = type({
    owner: ID,
    createdAt: type('number'),
  })

  plugin.addSchemaGlobal(ID, 'UserID')
  plugin.addSchemaGlobal(user, 'User')
  plugin.addSchemaGlobal(account, 'Account')
  expect(plugin.getSchemas()).toEqual({
    schemas: {
      UserID: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'number',
      },
      User: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: {type: 'number'},
          username: {type: 'string'},
        },
        required: ['id', 'username'],
      },
      Account: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {owner: {type: 'number'}, createdAt: {type: 'number'}},
        required: ['createdAt', 'owner'],
      },
    },
  })

  expect(plugin.addSchema(ID).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'number',
  })

  expect(plugin.addSchema(user).resolve()).toEqual({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    properties: {
      id: {type: 'number'},
      username: {type: 'string'},
    },
    required: ['id', 'username'],
    type: 'object',
  })
})
