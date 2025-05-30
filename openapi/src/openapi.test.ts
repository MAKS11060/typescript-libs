#!/usr/bin/env -S deno run -A --watch-hmr

import '../../debug/yaml.ts'
import {createDoc} from './openapi.ts'
import {zodPlugin} from './plugins/zod.ts'

export const doc = createDoc({
  plugins: {
    schema: [zodPlugin()],
  },

  info: {title: '', version: ''},
  tags: [{name: 'A'}, {name: 'B'}],
})

// setTimeout(() => console.log(doc.toDoc()))
// setTimeout(() => console.log(doc.toJSON(true)))
setTimeout(() => console.yaml(doc.toDoc()))

////////////////////////////////
const testHeader = doc.addHeader('Test', t => {
  t.schema({})
})

doc
  .addPath('/') //
  .get((t) => {
    t.response(200, t => {
      t.header('x-header', t => {
        t.schema({})
      })
      t.header('text', testHeader)
    })
  })
