#!/usr/bin/env -S deno run -A --watch

import {Hono} from 'npm:hono'
import {cors} from 'npm:hono/cors'
import {doc} from './main.ts'

const app = new Hono() //
  .use(cors())
  .get('/openapi.json', (c) =>
    c.text(doc.toJSON(true), {headers: {'Content-Type': 'application/json'}})
  )
  .get('/openapi.yml', (c) => c.text(doc.toYAML()))

Deno.serve(app.fetch)
