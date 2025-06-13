#!/usr/bin/env -S deno run -A --watch-hmr

import { zodPlugin } from '@maks11060/openapi/zod'
import { expect } from 'jsr:@std/expect/expect'
import z from 'zod/v4'
import { createDoc } from './openapi.ts'

Deno.test('createDoc()', async (t) => {
  const doc = createDoc({
    info: {title: 'test', version: '1'},
  })

  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    paths: {},
    components: {},
  })
})

Deno.test('createDoc() components schemas', async (t) => {
  const doc = createDoc({
    info: {title: 'test', version: '1'},
  })

  doc.addSchema('ID', {type: 'integer'})

  // console.log(doc.toDoc())
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    paths: {},
    components: {
      schemas: {
        ID: {type: 'integer'},
      },
    },
  })
})

Deno.test('createDoc() components schemas with zod plugin', async (t) => {
  const doc = createDoc({
    plugins: {schema: [zodPlugin()]},
    info: {title: 'test', version: '1'},
  })

  const ID = z.int().positive()
  const user = z.object({id: ID, username: z.string()})

  doc.addSchemas({ID, user})

  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {title: 'test', version: '1'},
    paths: {},
    components: {
      schemas: {
        ID: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'integer',
          exclusiveMinimum: 0,
          maximum: 9007199254740991,
        },
        user: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            id: {$ref: '#/components/schemas/ID'},
            username: {type: 'string'},
          },
          required: ['id', 'username'],
          additionalProperties: false,
        },
      },
    },
  })
})

Deno.test('createDoc() components responses', async (t) => {
  const doc = createDoc({
    plugins: {schema: [zodPlugin()]},
    info: {title: 'test', version: '1'},
  })

  doc.addResponse('OK', (t) => {
    t.describe('test response')
    t.header('x-text', (t) => {
      t.schema(z.string())
        .example('example', (t) => t.value('1234'))
    })
    t.content('application/json', z.object({value: z.string()}))
      .example('example', (t) => t.value({value: 'ok'}))
  })

  // console.log(doc.toJSON(true))
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    paths: {},
    components: {
      responses: {
        OK: {
          description: 'test response',
          headers: {
            'x-text': {
              schema: {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                type: 'string',
              },
              examples: {
                example: {
                  value: '1234',
                },
              },
            },
          },
          content: {
            'application/json': {
              schema: {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                type: 'object',
                properties: {
                  value: {
                    type: 'string',
                  },
                },
                required: [
                  'value',
                ],
                additionalProperties: false,
              },
              examples: {
                example: {
                  value: {
                    value: 'ok',
                  },
                },
              },
            },
          },
        },
      },
    },
  })
})

Deno.test('createDoc() components parameters', async (t) => {
  const doc = createDoc({
    plugins: {schema: [zodPlugin()]},
    info: {title: 'test', version: '1'},
  })

  doc.addParameter('QueryParamTest', 'query', 'test', (t) => {
    t.schema(z.object({value: z.string()}))
      .example('example', (t) => t.value({value: 'ok'}))
  })
  doc.addParameter('HeaderParamTest', 'header', 'test', (t) => {
    t.schema(z.object({value: z.string()}))
      .example('example', (t) => t.value({value: 'ok'}))
  })
  doc.addParameter('PathParamTest', 'path', 'test', (t) => {
    t.schema(z.object({value: z.string()}))
      .example('example', (t) => t.value({value: 'ok'}))
  })
  doc.addParameter('CookieParamTest', 'cookie', 'test', (t) => {
    t.schema(z.object({value: z.string()}))
      .example('example', (t) => t.value({value: 'ok'}))
  })

  // console.log(doc.toJSON(true))
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    paths: {},
    components: {
      parameters: {
        QueryParamTest: {
          in: 'query',
          name: 'test',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              value: {
                type: 'string',
              },
            },
            required: [
              'value',
            ],
            additionalProperties: false,
          },
          examples: {
            example: {
              value: {
                value: 'ok',
              },
            },
          },
        },
        HeaderParamTest: {
          in: 'header',
          name: 'test',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              value: {
                type: 'string',
              },
            },
            required: [
              'value',
            ],
            additionalProperties: false,
          },
          examples: {
            example: {
              value: {
                value: 'ok',
              },
            },
          },
        },
        PathParamTest: {
          in: 'path',
          name: 'test',
          required: true,
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              value: {
                type: 'string',
              },
            },
            required: [
              'value',
            ],
            additionalProperties: false,
          },
          examples: {
            example: {
              value: {
                value: 'ok',
              },
            },
          },
        },
        CookieParamTest: {
          in: 'cookie',
          name: 'test',
          schema: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              value: {
                type: 'string',
              },
            },
            required: [
              'value',
            ],
            additionalProperties: false,
          },
          examples: {
            example: {
              value: {
                value: 'ok',
              },
            },
          },
        },
      },
    },
  })
})

Deno.test('createDoc() paths', async (t) => {
  const doc = createDoc({
    plugins: {schema: [zodPlugin()]},
    info: {title: 'test', version: '1'},
  })

  doc.addPath('/api')
    .get((t) => {
      t.summary('test')
      t.describe('get test')
      t.tag('abc')
      t.operationId('get_test')

      t.requestBody((t) => {
        t.content('application/json', z.object({}))
      })
      t.response(200, (t) => {
        t.content('application/json', z.object({}))
      })
    })

  // console.log(doc.toJSON(true))
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {
      title: 'test',
      version: '1',
    },
    paths: {
      '/api': {
        get: {
          tags: [
            'abc',
          ],
          summary: 'test',
          description: 'get test',
          operationId: 'get_test',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  $schema: 'https://json-schema.org/draft/2020-12/schema',
                  type: 'object',
                  properties: {},
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Response 200',
              content: {
                'application/json': {
                  schema: {
                    $schema: 'https://json-schema.org/draft/2020-12/schema',
                    type: 'object',
                    properties: {},
                    additionalProperties: false,
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {},
  })
})

// Deno.test('Test', async (t) => {
//   const doc = createDoc({
//     info: {
//       title: 'test',
//       version: '1',
//     },
//   })

//   const testQueryParam = doc.addParameter('Test', 'query', 'q', (t) => {
//     t.required() //
//       .schema({type: 'string'})
//       .example('Example1', (t) => t.value('123'))
//   })

//   // doc.addPathItem('test', (t) => {
//   // t.parameter(testQueryParam)
//   // })

//   // console.log(doc.toDoc())
//   // console.log(doc.toYAML())
// })

// Deno.test('Test 1', async (t) => {
//   const doc = createDoc({
//     info: {
//       title: 'test',
//       version: '1',
//     },
//   })

//   const testSchema = doc.addSchema('Test', {})
//   const testExample = doc.addExample('Test', (t) => {
//     t.summary('summary')
//     t.describe('description')
//     t.value('val1')
//   })
//   const testResponse = doc.addResponse('Test', (t) => {
//     t.describe('description')
//     t.content('application/json', {type: 'string'})
//     t.header('x-header', (t) => {
//       t.schema({type: 'string'}) //
//         .example('Example_1', (t) => t.value('123'))
//         .example('Example_2', testExample)
//     })
//   })
//   const testRequestBody = doc.addRequestBody('Test', (t) => {
//     t.describe('description')
//     t.content('application/json', {type: 'string'}) //
//       .example('Example_1', (t) => t.value('123'))
//       .example('Example_2', testExample)
//     t.required()
//   })

//   const testQueryParam = doc.addParameter('Test', 'query', 'q', (t) => {
//     t.required() //
//       .schema({type: 'string'})
//       .example('Example_1', (t) => t.value('123'))
//       .example('Example_2', testExample)
//   })

//   const testPath = doc.addPathItem('Test', (t) => {
//     t.get((t) => {
//       t.requestBody(testRequestBody)
//       t.response(200, testResponse)
//       t.parameter(testQueryParam)
//     })
//   })

//   const anon = doc.addSecuritySchema.anonymous()
//   const oauth2 = doc.addSecuritySchema.oauth2('OAuth2', {
//     implicit: {
//       authorizationUrl: '',
//       scopes: {
//         read: '',
//         write: '',
//       },
//     },
//   })

//   doc.security(anon)
//   doc.security(oauth2, ['read'])

//   console.log(doc.toJSON(true))
//   expect(doc.toDoc()).toEqual({
//     openapi: '3.1.1',
//     info: {
//       title: 'test',
//       version: '1',
//     },
//     security: [
//       {},
//       {
//         OAuth2: ['read'],
//       },
//     ],
//     paths: {},
//     components: {
//       responses: {
//         Test: {
//           description: 'description',
//           headers: {
//             'x-header': {
//               schema: {
//                 type: 'string',
//               },
//               examples: {
//                 Example_1: {
//                   value: '123',
//                 },
//                 Example_2: {
//                   $ref: '#/components/examples/Test',
//                 },
//               },
//             },
//           },
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'string',
//               },
//             },
//           },
//         },
//       },
//       parameters: {
//         Test: {
//           in: 'query',
//           name: 'q',
//           required: true,
//           schema: {
//             type: 'string',
//           },
//           examples: {
//             Example_1: {
//               value: '123',
//             },
//             Example_2: {
//               $ref: '#/components/examples/Test',
//             },
//           },
//         },
//       },
//       examples: {
//         Test: {
//           summary: 'summary',
//           description: 'description',
//           value: 'val1',
//         },
//       },
//       requestBodies: {
//         Test: {
//           description: 'description',
//           required: true,
//           content: {
//             'application/json': {
//               schema: {
//                 type: 'string',
//               },
//               examples: {
//                 Example_1: {
//                   value: '123',
//                 },
//                 Example_2: {
//                   $ref: '#/components/examples/Test',
//                 },
//               },
//             },
//           },
//         },
//       },
//       securitySchemes: {
//         OAuth2: {
//           type: 'oauth2',
//           flows: {
//             implicit: {
//               authorizationUrl: '',
//               scopes: {
//                 read: '',
//                 write: '',
//               },
//             },
//           },
//         },
//       },
//       pathItems: {
//         Test: {
//           get: {
//             parameters: [
//               {
//                 $ref: '#/components/parameters/Test',
//               },
//             ],
//             requestBody: {
//               $ref: '#/components/requestBodies/Test',
//             },
//             responses: {
//               '200': {
//                 $ref: '#/components/responses/Test',
//               },
//             },
//           },
//         },
//       },
//     },
//   })
// })

// Deno.test('Parameters', async (t) => {
//   const doc = createDoc({
//     plugins: {
//       schema: [zodPlugin()],
//     },
//     info: {title: 'test', version: '1'},
//   })

//   const queryParam2 = doc.addParameter('Param2', 'query', 'param2', (t) => {
//     t.schema(z.number())
//   })

//   doc
//     .addPath('/1') //
//     .parameter('query', 'param1', (t) => {
//       t.schema(z.number())
//     })
//     .get((t) => {
//       t.parameter(queryParam2)
//       t.parameter('query', 'param3', (t) => t.schema(z.number()))
//     })

//   doc
//     .addPath('/2/{param1}/{param2}', {
//       param2: (t) => t.schema(z.number()),
//     }) //
//     .parameter('query', 'param1', (t) => {
//       t.schema(z.number())
//     })
//     .get((t) => {
//       t.parameter(queryParam2)
//       t.parameter('query', 'param3', (t) => t.schema(z.number()))
//     })

//   doc.addParameter('ParamWithContent', 'query', 'content', (t) => {
//     t.content(
//       'application/json',
//       z.object({
//         key: z.string(),
//       }),
//     )
//   })

//   console.log(doc.toJSON(true))
//   expect(doc.toDoc()).toEqual({
//     openapi: '3.1.1',
//     info: {
//       title: 'test',
//       version: '1',
//     },
//     paths: {
//       '/1': {
//         parameters: [
//           {
//             in: 'query',
//             name: 'param1',
//             schema: {
//               $schema: 'https://json-schema.org/draft/2020-12/schema',
//               type: 'number',
//             },
//           },
//         ],
//         get: {
//           parameters: [
//             {
//               $ref: '#/components/parameters/Param2',
//             },
//             {
//               in: 'query',
//               name: 'param3',
//               schema: {
//                 $schema: 'https://json-schema.org/draft/2020-12/schema',
//                 type: 'number',
//               },
//             },
//           ],
//         },
//       },
//       '/2/{param1}/{param2}': {
//         parameters: [
//           {
//             in: 'path',
//             name: 'param1',
//             required: true,
//             schema: {
//               type: 'string',
//             },
//           },
//           {
//             in: 'path',
//             name: 'param2',
//             required: true,
//             schema: {
//               $schema: 'https://json-schema.org/draft/2020-12/schema',
//               type: 'number',
//             },
//           },
//           {
//             in: 'query',
//             name: 'param1',
//             schema: {
//               $schema: 'https://json-schema.org/draft/2020-12/schema',
//               type: 'number',
//             },
//           },
//         ],
//         get: {
//           parameters: [
//             {
//               $ref: '#/components/parameters/Param2',
//             },
//             {
//               in: 'query',
//               name: 'param3',
//               schema: {
//                 $schema: 'https://json-schema.org/draft/2020-12/schema',
//                 type: 'number',
//               },
//             },
//           ],
//         },
//       },
//     },
//     components: {
//       schemas: {},
//       parameters: {
//         Param2: {
//           in: 'query',
//           name: 'param2',
//           schema: {
//             $schema: 'https://json-schema.org/draft/2020-12/schema',
//             type: 'number',
//           },
//         },
//         ParamWithContent: {
//           in: 'query',
//           name: 'content',
//           content: {
//             'application/json': {
//               schema: {
//                 $schema: 'https://json-schema.org/draft/2020-12/schema',
//                 type: 'object',
//                 properties: {
//                   key: {
//                     type: 'string',
//                   },
//                 },
//                 required: ['key'],
//                 additionalProperties: false,
//               },
//             },
//           },
//         },
//       },
//     },
//   })
// })

// Deno.test('createDoc() schemas', async (t) => {
//   const doc = createDoc({
//     plugins: {schema: [zodPlugin()]},
//     info: {title: 'test', version: '1'},
//   })

//   const ID = z.int().positive()
//   const user = z.object({
//     id: ID,
//     username: z.string(),
//   })

//   console.log(doc.addSchemas({ID, user}))
//   console.log(doc.toYAML())
// })
