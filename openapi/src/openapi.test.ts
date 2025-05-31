#!/usr/bin/env -S deno run -A --watch-hmr

import {expect} from 'jsr:@std/expect'
import {createDoc} from './openapi.ts'

Deno.test('Test 1', async (t) => {
  const doc = createDoc({
    info: {
      title: 'test',
      version: '1',
    },
  })

  const testSchema = doc.addSchema('Test', {})
  const testExample = doc.addExample('Test', (t) => {
    t.summary('summary')
    t.describe('description')
    t.value('val1')
  })
  const testResponse = doc.addResponse('Test', (t) => {
    t.describe('description')
    t.content('application/json', {type: 'string'})
    t.header('x-header', (t) => {
      t.schema({type: 'string'}) //
        .example('Example_1', (t) => t.value('123'))
        .example('Example_2', testExample)
    })
  })
  const testRequestBody = doc.addRequestBody('Test', (t) => {
    t.describe('description')
    t.content('application/json', {type: 'string'}) //
      .example('Example_1', (t) => t.value('123'))
      .example('Example_2', testExample)
    t.required()
  })

  const testQueryParam = doc.addParameter('Test', 'query', 'q', (t) => {
    t.required() //
      .schema({type: 'string'})
      .example('Example_1', (t) => t.value('123'))
      .example('Example_2', testExample)
  })

  const testPath = doc.addPathItem('Test', t => {
    t.get(t => {
      t.requestBody(testRequestBody)
      t.response(200, testResponse)
      t.parameter(testQueryParam)
    })
  })

  console.log(doc.toJSON(true))
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    paths: {},
    components: {
      responses: {
        Test: {
          description: 'description',
          headers: {
            'x-header': {
              schema: {
                type: 'string',
              },
              examples: {
                Example_1: {
                  value: '123',
                },
                Example_2: {
                  $ref: '#/components/examples/Test',
                },
              },
            },
          },
          content: {
            'application/json': {
              schema: {
                type: 'string',
              },
            },
          },
        },
      },
      examples: {
        Test: {
          summary: 'summary',
          description: 'description',
          value: 'val1',
        },
      },
    },
  })

})

/* import '../../debug/yaml.ts'
import {createDoc} from './openapi.ts'
import {zodPlugin} from './plugins/zod.ts'

export const doc = createDoc({
  plugins: {
    schema: [zodPlugin()],
  },
  info: {title: '', version: ''},
  tags: [{name: 'Tag'}, {name: 'Tag_2'}],
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
 */
