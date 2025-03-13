#!/usr/bin/env -S deno run -A --watch

import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {YAML} from './_deps.ts'
import {openApiDoc} from './openapi2.ts'

const app = new Hono() //
  .use(cors())
  .get('/openapi.yml', (c) => c.text(YAML.stringify(openApiDoc.openapi)))

Deno.serve(app.fetch)

// Usage
// addPath('/api/{version}', {
//   params: {
//     version: {
//       description: 'API version',
//     },
//   },
// }).post((t) => {
//   t.request('query').schema({
//     type: 'object',
//     properties: {
//       q: {type: 'string'},
//     },
//   })

//   t.requestBody('application/json')
//     .describe('Request description')
//     .schema({
//       type: 'object',
//       properties: {
//         query: {type: 'string'},
//       },
//       required: ['query'],
//     })

//   t.response(200, 'application/json')
//     .describe('Response description')
//     .schema({
//       type: 'object',
//       properties: {
//         message: {type: 'string'},
//       },
//     })
// })

console.log(YAML.stringify(openApiDoc.openapi))
