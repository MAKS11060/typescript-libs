#!/usr/bin/env -S deno run -A --watch

import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
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
const testQuery = doc.addParameter('testQuery', 'query', 'q2', (t) => {})

doc
  .addPath('/api/users/{id1}/{id2}') //
  .parameter('query', 'q1', (t) => {})
  .parameter(testQuery)
  .get((t) => {
    t.parameter('query', 'q3', (t) => {})
  })
