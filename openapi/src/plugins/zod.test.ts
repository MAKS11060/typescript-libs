#!/usr/bin/env -S deno run -A --watch-hmr

import z from 'zod/v4'
import '../../../debug/yaml.ts'
import {zodPlugin} from './zod.ts'

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

plugin.addSchemaGlobal(userId, 'UserID')
plugin.addSchemaGlobal(user, 'User')
plugin.addSchemaGlobal(account, 'Account')

console.yaml(plugin.getSchemas())
