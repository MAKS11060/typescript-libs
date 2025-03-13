#!/usr/bin/env -S deno run -A --watch-hmr

export type ContentType = 'application/json' | 'text/plain'

type DocOptions = {
  version: `3.1.${number}`
  paths: Record<string, any>
}
const doc = (options: DocOptions) => {
  return {
    openapi: '3.1.0',
    info: {
      title: '',
      version: '0.0.1',
    },
  }
}

const path = (value:{
  get: {}
}) => {
}

const oa = {
  doc,
  path
}
const schema = oa.doc({
  version: '3.1.0',
  paths: {
    '/': oa.path({
      get: oa.get({

        content: {
          ''
        }
      })
    })
  },
})

console.log(schema)
