#!/usr/bin/env -S deno run -A --watch

import {Hono} from 'hono'
import {sValidator} from 'npm:@hono/standard-validator'
import {z} from 'zod'
import {createOpenApiDoc} from '../types/openapi.ts'

export const api = new Hono() //
export const doc = createOpenApiDoc({info: {title: 'local', version: '1'}, servers: [{url: 'http://localhost:8000/'}]})

// users schemas
const userSchema = z.object({
  id: z.string(),
  name: z.string(),
})
const usersSchema = z.array(userSchema)

// users openapi
doc.addPath('/users').get((t) => {
  t.describe('Users list')
  t.response(200)
    .describe('Success response')
    .content('application/json', usersSchema)
    .examples('Users', {value: [{id: '1', name: 'test'}]})
})

api.get('/users', (c) => {
  return c.json([])
})

doc.addPath('/user/create').post((t) => {
  t.describe('Create user')
  t.response(200)
    .content('application/json', userSchema)
    .examples('CreateUser', {value: {id: '2', name: 'newUser'}})

  // t.parameters({style: 'matrix'})

  t.requestBody((t) => {
    t.content('application/json', userSchema).required()
    t.content('text/plain', userSchema)
  })
})

api.post('/user/create', sValidator('json', userSchema), (c) => {
  const user = c.req.valid('json')
  return c.json(user)
})
