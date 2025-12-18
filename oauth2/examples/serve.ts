#!/usr/bin/env -S deno run -A --env-file --watch-hmr

import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'


const app = new Hono()
  .use(cors())
  .use(logger())

app.get('/', (c) => {
  return c.json(i++)
})



if (Deno.env.has('KEY') && Deno.env.has('CERT')) {
  const key = Deno.readTextFileSync(Deno.env.get('KEY')!)
  const cert = Deno.readTextFileSync(Deno.env.get('CERT')!)
  Deno.serve({port: 443, key, cert}, app.fetch)
} else {
  Deno.serve({port: 80}, app.fetch)
}
