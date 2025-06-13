#!/usr/bin/env -S deno run -A --watch-hmr

import { expect } from 'jsr:@std/expect/expect'
import * as v from 'npm:valibot'
import '../../../debug/yaml.ts'
import { valibotPlugin } from './valibot.ts'

Deno.test('valibotPlugin()', async (t) => {
  const plugin = valibotPlugin()

  const ID = v.number()
  const user = v.object({
    id: ID,
    username: v.string(),
  })
  const account = v.object({
    owner: ID,
    createdAt: v.number(),
  })

  plugin.addSchemaGlobal(ID, 'UserID')
  plugin.addSchemaGlobal(user, 'User')
  plugin.addSchemaGlobal(account, 'Account')

  expect(plugin.getSchemas()).toEqual({
    schemas: {
      UserID: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'number',
      },
      User: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          id: {type: 'number'},
          username: {type: 'string'},
        },
        required: ['id', 'username'],
      },
      Account: {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {owner: {type: 'number'}, createdAt: {type: 'number'}},
        required: ['owner', 'createdAt'],
      },
    },
  })

  expect(plugin.addSchema(ID).resolve()).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'number',
  })

  expect(plugin.addSchema(user).resolve()).toEqual({
    $schema: 'http://json-schema.org/draft-07/schema#',
    properties: {
      id: {type: 'number'},
      username: {type: 'string'},
    },
    required: ['id', 'username'],
    type: 'object',
  })
})
