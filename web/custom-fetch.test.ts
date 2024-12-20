#!/usr/bin/env -S deno test -A --watch

import {createClient} from './custom-fetch.ts'

Deno.serve((req) =>
  Response.json({url: req.url, Headers: Object.fromEntries(req.headers)})
)

const client = createClient({basePath: 'http://localhost:8000'})
client.use({
  onRequest(req) {
    req.headers.set('authorization', 'Bearer 1234')
    return req
  },
})

{
  const res = await client.GET('/{apiVersion}/{path}', {
    params: {apiVersion: 'v1', path: '123'},
    query: {q: '123'},
  })
  console.log(res.response)
  console.log(await res.data)
}
