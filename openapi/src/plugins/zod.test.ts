#!/usr/bin/env -S deno run -A --watch-hmr

import z from 'zod/v4'
import '../../../debug/yaml.ts'
import { zodPlugin } from './zod.ts'

const userId = z.string()
const user = z.object({
  id: userId,
  username: z.string(),
  nickname: z.string(),
  get friend() {
    return user
  },
})
const account = z.object({
  owner: user,
  createdAt: z.iso.date(),
})

const plugin = zodPlugin()

plugin.addSchema(user)

plugin.addSchemaGlobal(userId, 'UserID')
plugin.addSchemaGlobal(user, 'User')
plugin.addSchemaGlobal(account, 'Account')

// console.yaml(plugin.getSchemas()) // get global
console.log(JSON.stringify(plugin.getSchemas().schemas, null, 2))

// console.yaml(plugin.addSchema(userId).resolve())
console.yaml(plugin.addSchema(user).resolve())
console.log(JSON.stringify(plugin.addSchema(user).resolve(), null, 2))
