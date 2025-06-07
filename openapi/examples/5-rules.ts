#!/usr/bin/env -S deno run -A --watch

import {createDoc} from '../mod.ts'
// import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
import {serve} from './serve.ts'

setTimeout(() => console.yaml(doc.toDoc()))

const doc = createDoc({
  info: {title: 'test', version: '1'},
  rules: {
    security: false,
    operationId: 'no-check',
  },

  plugins: {
    schema: [zodPlugin()],
  },
})

serve(doc)

//////////////////////////////// CODE
const oauth2 = doc.addSecuritySchema.oauth2('a', {
  implicit: {
    authorizationUrl: '',
    scopes: {
      a: '',
      b: '',
    },
  },
})

doc.security(oauth2, ['a', 'c'])

doc
  .addPath('/')
  .get((t) => {
    t.operationId('get_root')
  })
  .post((t) => {
    t.operationId('get_root')
  })
