#!/usr/bin/env -S deno run -A --env-file --watch

import {Hono} from 'hono'
import {cors} from 'hono/cors'
// import {doc} from './1.ts'
// import {doc} from './2.ts'
import {doc} from './3.ts'

const app = new Hono() //
  .use(cors())
  .get('/openapi.yml', (c) => c.text(doc.toYAML()))

Deno.serve(app.fetch)

console.log(doc.toYAML())