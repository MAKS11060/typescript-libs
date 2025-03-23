#!/usr/bin/env -S deno run -A --watch

import {z} from 'zod'
import {createOpenApiDoc} from '../types/openapi.ts'

export const doc = createOpenApiDoc({info: {title: 'local', version: '1'}, servers: [{url: 'http://localhost:8000/'}]})

// users schemas
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
})
const usersSchema = z.array(userSchema)

// doc.addSchema('User', userSchema)
doc.addSchema('Users', usersSchema)

const UsersListResponse = doc.addResponses('UsersList', (t) => {
  t.content('application/json', usersSchema)
})

// doc.addPath('/v1/users').get((t) => {
//   t.response(200, UsersListResponse).describe('Resp 200').summary('Users list')
//   t.response(201, UsersListResponse).describe('Resp 200')
//   t.response(202, UsersListResponse).summary('Users list 2')
// })

const tokenInHeader = doc.addParameters('token', 'header', {
  schema: {
    type: 'string',
    format: 'password',
  }
})

const authApi = doc.addSecuritySchemes('auth', 'apiKey', {in: 'cookie', name: 'token'})

doc //
  .addPath('/v1/users')
  .get((t) => {
    t.security(authApi)
    t.parameter(tokenInHeader)
    t.parameter('int64', 'header', (t) => {
      t.content('application/json', {
        type: 'string',
        format: 'int64',
      })
    })
    t.response(200, UsersListResponse)
  })
