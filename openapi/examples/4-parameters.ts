#!/usr/bin/env -S deno run -A --watch

import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
import {z} from "zod/v4"
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
const q1 = z.number().describe('q1')
const q2 = z.number().describe('q2')

// const testQuery = doc.addParameter('testQuery', 'query', 'q2', (t) => {
//   t.schema(q1)
// })

doc
  .addPath('/api/users/{id1}/{id2}', {
    // id2: t=> t.schema(q2),
  })
  //
  // .parameter('query', 'q1', (t) => {
  //   t.schema(q2)
  // })
  // .parameter(testQuery)
  // .get((t) => {
  //   t.parameter('query', 'q3', (t) => {})
  // })
