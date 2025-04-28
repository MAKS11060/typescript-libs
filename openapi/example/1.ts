#!/usr/bin/env -S deno run -A --watch

import {o} from '../openapi-schema.ts'
import {createOpenApiDoc} from '../openapi.ts'

export const doc = createOpenApiDoc({
  info: {
    title: 'Sample API',
    description: 'A sample API to demonstrate all possible fields in OpenAPI 3.1',
    termsOfService: 'https://example.com/terms/',
    contact: {
      name: 'API Support',
      url: 'https://example.com/support',
      email: 'support@example.com',
    },
    license: {
      name: 'Apache 2.0',
      url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
    },
    version: '1.0.0',
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
      description: 'Production server',
      variables: {
        basePath: {
          default: '/v1',
          description: 'Base path for the API',
        },
      },
    },
    {
      url: 'https://staging.api.example.com/{basePath}',
      description: 'Staging server',
      variables: {
        basePath: {
          default: '/v1',
          enum: ['/v1', '/v2'],
          description: 'Base path for the API',
        },
      },
    },
  ],
  externalDocs: {
    description: 'More documentation',
    url: 'https://example.com/docs',
  },
})

const UserSchema = doc.addSchema(
  'User',
  o.object({
    id: o.string(),
    name: o.string(),
    email: o.string().format('email').optional(),
    isActive: o.boolean().optional(),
    createdAt: o.string().format('date-time').optional(),
  })
)

const ErrorSchema = doc.addSchema(
  'Error',
  o.object({
    code: o.integer().optional(),
    message: o.string().optional(),
  })
)

// Responses
const NotFoundResponse = doc.addResponses('NotFound', (t) => {
  t.describe('The specified resource was not found')
  t.content('application/json', ErrorSchema)
})

const UnauthorizedResponse = doc.addResponses('Unauthorized', (t) => {
  t.describe('Unauthorized access')
  t.headers({'WWW-Authenticate': {schema: {type: 'string'}}})
})

// Parameters
const userIdInPath = doc.addParameters('userId', 'path', {
  description: 'ID of the user',
  schema: o.integer().format('int64'),
})
const pageInQuery = doc.addParameters('page', 'query', {
  description: 'Page number',
  schema: o.integer().default(1),
})

// Examples
const UserExample = doc.addExamples('UserExample', {
  value: {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    isActive: true,
    createdAt: '2023-01-01T00:00:00Z',
  },
})

//
const CreateUserBody = doc.addRequestBodies('CreateUser', (t) => {
  t.describe('User data to create a new user')
  t.required()
  t.content('application/json', UserSchema)
})

// Headers
const xRateLimitHeader = doc.addHeaders('X-RateLimit-Limit', {
  description: 'The number of allowed requests in the current period',
  schema: o.integer().optional(),
})

// SecuritySchemes
const apiKey = doc.addSecuritySchemes('apiKey', 'apiKey', {in: 'header', name: 'X-API-Key'})
doc.addSecuritySchemes('oauth2', 'oauth2', {
  flows: {
    authorizationCode: {
      authorizationUrl: 'https://example.com/oauth/authorize',
      tokenUrl: 'https://example.com/oauth/token',
      scopes: {
        read: 'Grants read access',
        write: 'Grants write access',
      },
    },
  },
})

// Paths
doc
  .addPath('/users')
  .parameters(pageInQuery)

  .get((t) => {
    t.summary('List all users')
    t.operationId('listUsers')
    t.parameters(pageInQuery)

    t.response(200).content('application/json', o.array(UserSchema))
    t.response(401, UnauthorizedResponse)

    t.security(apiKey)
  })
