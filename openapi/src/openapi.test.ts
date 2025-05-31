#!/usr/bin/env -S deno run -A --watch-hmr

import {expect} from 'jsr:@std/expect'
import {createDoc} from './openapi.ts'

Deno.test('Test', async (t) => {
  const doc = createDoc({
    info: {
      title: 'test',
      version: '1',
    },
  })

  const testQueryParam = doc.addParameter('Test', 'query', 'q', (t) => {
    t.required() //
      .schema({type: 'string'})
      .example('Example1', (t) => t.value('123'))
  })

  // doc.addPathItem('test', (t) => {
  // t.parameter(testQueryParam)
  // })

  console.log(doc.toDoc())
  // console.log(doc.toYAML())
})

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

  const testPath = doc.addPathItem('Test', (t) => {
    t.get((t) => {
      t.requestBody(testRequestBody)
      t.response(200, testResponse)
      t.parameter(testQueryParam)
    })
  })

  const anon = doc.addSecuritySchema.anonymous()
  const oauth2 = doc.addSecuritySchema.oauth2('OAuth2', {
    implicit: {
      authorizationUrl: '',
      scopes: {
        read: '',
        write: '',
      },
    },
  })

  doc.security(anon)
  doc.security(oauth2, ['read'])

  console.log(doc.toJSON(true))
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    security: [
      {},
      {
        OAuth2: ['read'],
      },
    ],
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
      parameters: {
        Test: {
          in: 'query',
          name: 'q',
          required: true,
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
      examples: {
        Test: {
          summary: 'summary',
          description: 'description',
          value: 'val1',
        },
      },
      requestBodies: {
        Test: {
          description: 'description',
          required: true,
          content: {
            'application/json': {
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
        },
      },
      securitySchemes: {
        OAuth2: {
          type: 'oauth2',
          flows: {
            implicit: {
              authorizationUrl: '',
              scopes: {
                read: '',
                write: '',
              },
            },
          },
        },
      },
      pathItems: {
        Test: {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/Test',
              },
            ],
            requestBody: {
              $ref: '#/components/requestBodies/Test',
            },
            responses: {
              '200': {
                $ref: '#/components/responses/Test',
              },
            },
          },
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
