#!/usr/bin/env -S deno test -A --watch

import {Hono} from 'hono'
import {createClient} from './custom-fetch.ts'
import {wrapFetch} from './types.ts'

const app = new Hono() //
  .get('*', (c) => {
    return c.json({})
  })

Deno.test({
  name: 'createClient',
  fn: async (t) => {
    const client = createClient({basePath: 'http://localhost:8000', fetch: wrapFetch(app.fetch)})
    client.use({
      onRequest(req) {
        req.headers.set('authorization', 'Bearer 1234')
        return req
      },
    })

    await t.step({
      name: 'GET',
      fn: async () => {
        const {response, json} = await client.GET('/{apiVersion}/{path}', {
          params: {apiVersion: 'v1', path: '123'},
          query: {q: '123'},
        })

        console.log({response, json: await json()})
      },
    })
  },
})
