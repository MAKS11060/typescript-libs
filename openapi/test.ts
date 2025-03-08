#!/usr/bin/env -S deno run -A --watch-hmr

<<<<<<< HEAD
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {YAML} from './_deps.ts'
import {o} from './openapi-schema.ts'
import {createMyOpenApi} from './openapi0.ts'
=======
import {YAML} from './_deps.ts'
import {createMyOpenApi} from './openapi.ts'
>>>>>>> 7adf913 (add: openapi rc1)

const myOpenapi = createMyOpenApi({
  openapi: '3.1.0',
  info: {title: 'Test', version: '1'},
})

<<<<<<< HEAD
const UnauthorizedSchema = myOpenapi.addSchema(
  'Unauthorized',
  o.object({
    error: o.string(),
    message: o.string().const('Unauthorized'),
  })
)

myOpenapi
  .addPath('/users')
  .get({})
  .response(
    200,
    'application/json',
    o.object({
      id: o.string(),
      username: o.string(),
      role: o.enum(['user', 'admin']).optional(),
      avatar: o.string().nullable(),
    })
  )
  .response(
    400,
    'application/json',
    o.object({
      error: o.string(),
    })
  )
  .response(401, 'application/json', UnauthorizedSchema)

myOpenapi
  .addPath('/users/{id}', {params: {id: {schema: o.string()}}})
  .get({})
  .response(
    200,
    'application/json',
    o
      .object({
        id: o.string(),
        username: o.string(),
        role: o.enum(['user', 'admin']).optional(),
        avatar: o.string().nullable(),
      })
      .examples([
        {
          id: '1',
          username: 'user1',
          role: 'user',
          avatar: null,
        },
      ])
  )
  .response(
    400,
    'application/json',
    o.object({
      error: o.string(),
    })
  )
  .response(401, 'application/json', UnauthorizedSchema)

myOpenapi
  .addPath('/users/{id}', {params: {id: {schema: o.string()}}})
  .delete({}) //
  .response(
    200,
    'application/json',
    o.object({
      success: o.boolean(),
    })
  )

// const NotFoundRef = myOpenapi.addSchema('NotFound', {
//   type: 'object',
//   properties: {
//     message: {type: 'string'},
//   },
// })

// myOpenapi
//   .addPath('/posts')
//   .get({description: 'Get posts'})
//   .response(200, 'application/json', {
//     type: 'array',
//     items: {type: 'object', properties: {id: {type: 'integer'}, title: {type: 'string'}}},
//   })
//   .response(404, 'application/json', NotFoundRef)

// myOpenapi
//   .addPath('/posts/{id}', {
//     params: {
//       id: {
//         required: true,
//         description: "asd",
//         schema: {type: 'integer'},
//       },
//     },
//   })
//   .get({description: 'Get post by ID'})
//   .response(200, 'application/json', {
//     type: 'object',
//     properties: {id: {type: 'integer'}, title: {type: 'string'}},
//   })

// console.log(myOpenapi.getDocumentYAML())
console.log(YAML.stringify(myOpenapi.getDocument()))

const app = new Hono() //
  .use(cors())
  .get('/openapi.yml', (c) => {
    return c.text(YAML.stringify(myOpenapi.getDocument()))
  })

Deno.serve(app.fetch)
=======
const NotFoundRef = myOpenapi.addSchema('NotFound', {
  type: 'object',
  properties: {
    message: {type: 'string'},
  },
})

myOpenapi
  .addPath('/posts')
  .get({description: 'Get posts'})
  .response(200, 'application/json', {
    type: 'array',
    items: {type: 'object', properties: {id: {type: 'integer'}, title: {type: 'string'}}},
  })
  .response(404, 'application/json', NotFoundRef)

myOpenapi
  .addPath('/posts/{id}', {
    params: {
      id: {
        required: true,
        description: "asd",
        schema: {type: 'integer'},
      },
    },
  })
  .get({description: 'Get post by ID'})
  .response(200, 'application/json', {
    type: 'object',
    properties: {id: {type: 'integer'}, title: {type: 'string'}},
  })


// console.log(myOpenapi.getDocumentYAML())
console.log(YAML.stringify(myOpenapi.getDocument()))
>>>>>>> 7adf913 (add: openapi rc1)
