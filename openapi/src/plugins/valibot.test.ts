#!/usr/bin/env -S deno run -A --watch-hmr

import * as v from 'npm:valibot'
import '../../../debug/yaml.ts'
import { valibotPlugin } from './valibot.ts'

const userId = v.string()
const user = v.object({
  id: userId,
  username: v.string(),
  nickname: v.string(),
})
const account = v.object({
  owner: userId,
  createdAt: v.number(),
})

const plugin = valibotPlugin()

plugin.addSchemaGlobal(userId, 'UserID')
plugin.addSchemaGlobal(user, 'User')
plugin.addSchemaGlobal(account, 'Account')

console.yaml(plugin.getSchemas())

// const s = toJsonSchema(user, {
//   definitions: {
//     UserID: userId
//   }
// })

// console.yaml(s)
