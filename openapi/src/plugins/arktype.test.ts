#!/usr/bin/env -S deno run -A --watch-hmr

import {type} from 'npm:arktype'
import '../../../debug/yaml.ts'
import {arktypePlugin} from './arktype.ts'

const userId = type('string')
const user = type({
  id: userId,
  username: type('string'),
  nickname: type('string'),
})
const account = type({
  owner: userId,
  createdAt: type('number'),
})

const plugin = arktypePlugin()

plugin.addSchemaGlobal(userId, 'UserID')
plugin.addSchemaGlobal(user, 'User')
plugin.addSchemaGlobal(account, 'Account')

console.yaml(plugin.getSchemas())
