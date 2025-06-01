#!/usr/bin/env -S deno run -A --watch-hmr

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

