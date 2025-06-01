#!/usr/bin/env -S deno run -A --watch

import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
import {z} from 'zod/v4'
import {serve} from './serve.ts'

setTimeout(() => console.yaml(doc.toDoc()))

const doc = createDoc({
  plugins: {
    schema: [zodPlugin()],
  },
  info: {title: 'test', version: '1'},
})

serve(doc)

//////////////////////////////// CODE
const userId1 = z.int().positive()
const userId2 = z.int().positive()
const queryParam = z.string()
const queryParam2 = z.string()

// doc.addSchema('userID1', userId1)
doc.addSchema('userID2', userId2)
doc.addSchema('queryParam', queryParam)

doc
  .addPath('/api/users/{id1}/{id2}', {
    id1: (t) => t.schema(userId1),
    id2: (t) => t.schema(userId2),
  })
  .parameter('query', 'q', (t) => {
    t.schema(queryParam)
  })

  .get((t) => {
    t.response(200, (t) => {
      t.content('application/json', userId1)
      t.content('application/json1', userId2)
    })
  })
