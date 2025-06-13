#!/usr/bin/env -S deno run -A --watch-hmr

import { z } from 'zod/v4'
import { createDoc } from '../mod.ts'
import { zodPlugin } from '../src/plugins/zod.ts'

setTimeout(() => console.log(doc.toYAML()))

const doc = createDoc({
  plugins: {
    schema: [zodPlugin()],
  },
  info: {
    title: 'test',
    version: '1.0.0',
  },
})

const user = z.object({
  id: z.number().positive(),
  username: z.string(),
  nickname: z.string(),
})

doc.addResponse('NotFound', (t) => {
  const notFound = z.object({
    error: z.string(),
    message: z.string(),
  })

  t.content('application/json', notFound) //
    .example('User not found', (t) => {
      t.value({error: 'NotFound', message: 'User not found'})
    })
})

doc
  .addPath('/api/user') //
  .get((t) => {
    t.summary('Get User')
    t.response(200, (t) => {
      t.content('application/json', user)
    })
  })
