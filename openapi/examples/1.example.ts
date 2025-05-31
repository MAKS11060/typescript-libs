#!/usr/bin/env -S deno run -A --watch-hmr

import '../../debug/yaml.ts'
import {createDoc} from '../mod.ts'
import {zodPlugin} from '../src/plugins/zod.ts'

setTimeout(() => console.yaml(doc.toDoc()))

////////////////////////////////
const doc = createDoc({
  plugins: {
    schema: [zodPlugin()],
  },
  info: {title: 'Test', version: '1.0.0'},
})

doc.addSchema('test', {
  type: 'string'
})

doc
  .addPath('/api/path') //
  .get((t) => {
    t.response(200, (t) => {
      t.content('application/json', {type: 'string'})
    })
  })

