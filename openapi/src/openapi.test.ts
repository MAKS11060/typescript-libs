#!/usr/bin/env -S deno run -A --watch-hmr

import { zodPlugin } from '@maks11060/openapi/zod'
import { expect } from 'jsr:@std/expect/expect'
import z from 'zod'
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

Deno.test('createDoc() schemas io', async (t) => {
  const doc = createDoc({
    plugins: {schema: [zodPlugin()]},
    info: {title: 'test', version: '1'},
  })

  const email = z.email()
  const emailOrUsername = z.string().transform((v: string) => {
    if (email.safeParse(v).success) {
      return {type: 'email', value: v} as const
    }
    return {type: 'username', value: v} as const
  }).pipe(z.discriminatedUnion('type', [
    z.object({type: z.literal('email'), value: email}),
    z.object({type: z.literal('username'), value: z.string()}),
  ]))

  const password = z.string().min(8).max(64)
  const authLoginSchema = z.object({
    login: emailOrUsername,
    password,
  })

  // doc.addSchema('authLoginSchemaIn', authLoginSchemaIn, 'input')
  const output = doc.addSchema('authLoginSchema', authLoginSchema)
  const input = doc.addSchema('authLoginSchemaIn', authLoginSchema, 'input')

  doc.addPath('/login')
    .post((t) => {
      // t.requestBody((t) => t.content('application/json', authLoginSchema))
      t.requestBody((t) => t.content('application/json', input))
      t.response(200, (t) => t.content('application/json', output))
      t.response(201, (t) => t.content('application/json', authLoginSchema))
    })

  // const res = doc.toDoc()
  // console.log(res.paths['/login'].post.requestBody.content)
  // console.log(res.paths['/login'].post.responses[200].content)

  // console.log(doc.toJSON())
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {title: 'test', version: '1'},
    paths: {
      '/login': {
        post: {
          requestBody: {content: {'application/json': {schema: {$ref: '#/components/schemas/authLoginSchemaIn'}}}},
          responses: {
            '200': {
              description: 'Response 200',
              content: {'application/json': {schema: {$ref: '#/components/schemas/authLoginSchema'}}},
            },
            '201': {
              description: 'Response 201',
              content: {'application/json': {schema: {$ref: '#/components/schemas/authLoginSchemaIn'}}},
            },
          },
        },
      },
    },
    components: {
      schemas: {
        authLoginSchema: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            login: {
              anyOf: [{
                type: 'object',
                properties: {
                  type: {type: 'string', const: 'email'},
                  value: {
                    type: 'string',
                    format: 'email',
                    pattern:
                      "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$",
                  },
                },
                required: ['type', 'value'],
                additionalProperties: false,
              }, {
                type: 'object',
                properties: {type: {type: 'string', const: 'username'}, value: {type: 'string'}},
                required: ['type', 'value'],
                additionalProperties: false,
              }],
            },
            password: {type: 'string', minLength: 8, maxLength: 64},
          },
          required: ['login', 'password'],
          additionalProperties: false,
        },
        authLoginSchemaIn: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {login: {type: 'string'}, password: {type: 'string', minLength: 8, maxLength: 64}},
          required: ['login', 'password'],
        },
      },
    },
  })
})

Deno.test('createDoc() security', async (t) => {
  const doc = createDoc({
    info: {title: 'test', version: '1'},
  })

  const anon = doc.addSecuritySchema.anonymous()

  const httpBasic = doc.addSecuritySchema.http('Basic', 'basic')

  const httpBearerToken = doc.addSecuritySchema.http('Bearer', 'bearer', 'JWT')

  const apiKey = doc.addSecuritySchema.apiKey('Key', 'header', 'api-key')

  const mtls = doc.addSecuritySchema.mutualTLS('mtls')

  const oauth2 = doc.addSecuritySchema.oauth2('petstore_auth', {
    implicit: {
      authorizationUrl: 'https://example.com/api/oauth/dialog',
      scopes: {
        'write:pets': 'modify pets in your account',
        'read:pets': 'read your pets',
      },
    },
    authorizationCode: {
      authorizationUrl: 'https://example.com/api/oauth/dialog',
      tokenUrl: 'https://example.com/api/oauth/token',
      scopes: {
        'write:pets': 'modify pets in your account',
        'read:pets': 'read your pets',
      },
    },
  })

  const openIdConnect = doc.addSecuritySchema.openIdConnect('OIDC', 'https://example.com')

  doc.security(anon)
  doc.security(httpBasic)
  doc.security(httpBearerToken)
  doc.security(apiKey)
  doc.security(mtls)
  doc.security(oauth2, ['write:pets', 'read:pets'])
  doc.security(openIdConnect, ['write', 'read'])

  doc.addPath('/api/user')
    .get((t) => {
      t.security(anon)
      t.security(httpBasic)
      t.security(httpBearerToken)
      t.security(apiKey)
      t.security(mtls)
      t.security(oauth2, ['write:pets', 'read:pets'])
      t.security(openIdConnect, ['write', 'read'])
    })

  // console.log(doc.toJSON(true))
  expect(doc.toDoc()).toEqual({
    openapi: '3.1.1',
    info: {title: 'test', version: '1'},
    security: [
      {},
      {Basic: []},
      {Bearer: []},
      {Key: []},
      {mtls: []},
      {petstore_auth: ['write:pets', 'read:pets']},
      {OIDC: ['write', 'read']},
    ],
    paths: {
      '/api/user': {
        get: {
          security: [
            {},
            {Basic: []},
            {Bearer: []},
            {Key: []},
            {mtls: []},
            {petstore_auth: ['write:pets', 'read:pets']},
            {OIDC: ['write', 'read']},
          ],
        },
      },
    },
    components: {
      securitySchemes: {
        Basic: {
          type: 'http',
          scheme: 'basic',
        },
        Bearer: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        Key: {
          type: 'apiKey',
          in: 'header',
          name: 'api-key',
        },
        mtls: {
          type: 'mutualTLS',
        },
        petstore_auth: {
          type: 'oauth2',
          flows: {
            implicit: {
              authorizationUrl: 'https://example.com/api/oauth/dialog',
              scopes: {
                'write:pets': 'modify pets in your account',
                'read:pets': 'read your pets',
              },
            },
            authorizationCode: {
              authorizationUrl: 'https://example.com/api/oauth/dialog',
              tokenUrl: 'https://example.com/api/oauth/token',
              scopes: {
                'write:pets': 'modify pets in your account',
                'read:pets': 'read your pets',
              },
            },
          },
        },
        OIDC: {
          type: 'openIdConnect',
          openIdConnectUrl: 'https://example.com',
        },
      },
    },
  })
})
