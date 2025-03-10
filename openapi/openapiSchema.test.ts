#!/usr/bin/env -S deno run -A --watch-hmr

import {o} from './openapiSchema.ts'

// const schema = o.string().optional()

// console.log(schema)
// console.log(schema.getSchema())

const userSchema = o.object({
  id: o.integer(),
  name: o.string().min(3),
  age: o.number().optional(),
  tags: o.array(o.string()).optional(),
})

console.log()
console.log(userSchema.getSchema())

/* import {YAML} from './_deps.ts'
import {o} from './openapiSchema.ts'
// import {z as o} from 'zod'



// const UserSchema = o.object({
//   id: o.integer().min(1),
//   name: o.string().min(3).max(50).optional(),
//   age: o.number().min(13).max(100).nullable(),
//   tags: o.array(o.string()).optional(),
//   isAdmin: o.string().enum(['true', 'false']),
// })
// console.log(YAML.stringify(UserSchema.getSchema()))


const UserSchema = o.object({
  id: o.integer().min(1),
  name: o.string().min(3).max(50).optional(),
  age: o.number().min(13).max(100).nullable(),
  tags: o.array(o.string()).optional(),
  isAdmin: o.enum(['true', 'false']),
})

const AccountSchema = o.object({
  user: UserSchema,
  createdAt: o.integer()
})

// console.log(YAML.stringify(UserSchema.getSchema()))
console.log(AccountSchema.getSchema())
console.log(YAML.stringify(AccountSchema.getSchema()))


 */
