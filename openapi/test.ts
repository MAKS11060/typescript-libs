#!/usr/bin/env -S deno run -A --watch-hmr

import {YAML} from './_deps.ts'
import {createMyOpenApi} from './openapi.ts'

const myOpenapi = createMyOpenApi({
  openapi: '3.1.0',
  info: {title: 'Test', version: '1'},
})

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
