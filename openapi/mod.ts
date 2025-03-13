#!/usr/bin/env -S deno run -A --watch

import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {o} from './openapi-schema.ts'
import {createOpenApiDoc} from './openapi.ts'

export const openApiDoc = createOpenApiDoc({
  info: {
    title: 'Test',
    version: '0.0.1',
  },
})
setTimeout(() => console.log(openApiDoc.toYAML()))
// setTimeout(() => console.log(openApiDoc.toJSON(true)))

const app = new Hono() //
  .use(cors())
  .get('/openapi.yml', (c) => c.text(openApiDoc.toYAML()))

Deno.serve(app.fetch)

const UserSchema = openApiDoc.addSchema(
  'Users',
  o.object({}).oneOf(o.object({a: o.string()}), o.object({b: o.string()}))
)
const UsersResponse = openApiDoc.addResponses('Users', (t) => {
  // t.headers({})
  t.content('application/json', UserSchema)
})

openApiDoc //
  .addPath('/users')
  .get((t) => {
    t.describe('123')
    t.response(200, UsersResponse)
  })

// const userSchema = o.object({
//   id: o.string(),
//   name: o.string(),
//   email: o.string().format('email').optional(),
//   isActive: o.boolean().optional(),
//   createdAt: o.string().format('date-time').optional(),
// })
// const errorSchema = o.object({
//   code: o.integer().optional(),
//   message: o.string().optional(),
// })

// const UserSchema = openApiDoc.addSchema('User', userSchema)
// const UsersSchema = openApiDoc.addSchema('Users', o.array(UserSchema))
// const ErrorSchema = openApiDoc.addSchema('Error', errorSchema)

// const NotFoundResponse = openApiDoc.addResponses('NotFound', (t) => {
//   t.content('application/json', ErrorSchema)
//   // t.describe('l')
// })

// openApiDoc //
//   .addPath('/users')
//   .describe('test')
//   .get((t) => {
//     t.summary('List all users')
//     t.operationId('listUsers')
//     t.response(200) //
//       .describe('OK')
//       .content('application/json', UsersSchema)
//       // .examples('example 1', {
//       //   description: 'Example 1',
//       //   value: {
//       //     id: '1',
//       //     name: 'admin',
//       //   },
//       // })

//     t.response(400, NotFoundResponse)
//   })
//   .post((t) => {
//     t.summary('Create a new user')
//     t.operationId('createUser')
//   })

// openApiDoc //
//   .addPath('/users/{id}', {
//     params: {
//       id: {
//         schema: o.string().toSchema(),
//         examples: {},
//       },
//     },
//   })
//   .describe('test')
//   .get((t) => {
//     t.summary('List all users')
//     t.response(200).content('application/json')
//   .post((t) => {})
//   })
