#!/usr/bin/env -S deno test -A --watch

import {Hono} from 'hono'
import {createClient} from './custom-fetch.ts'

const app = new Hono()

// Deno.serve((req) => Response.json({url: req.url, Headers: Object.fromEntries(req.headers)}))

Deno.test({
  name: 'createClient',
  fn: async (t) => {
    const client = createClient({basePath: 'http://localhost:8000', fetch: app.fetch})
    client.use({
      onRequest(req) {
        req.headers.set('authorization', 'Bearer 1234')
        return req
      },
      onResponse(res) {
        console.log(res.headers.get('content-length'))
        return res
      },
    })

    await t.step({
      name: 'GET',
      fn: async () => {
        const res = await client.GET('/{apiVersion}/{path}', {
          params: {apiVersion: 'v1', path: '123'},
          query: {q: '123'},
        })

        console.log(res.response)
        console.log(await res.data)
      },
    })
  },
})
