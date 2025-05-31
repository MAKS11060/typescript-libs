#!/usr/bin/env -S deno run -A

import {z} from 'zod/v4'
import '../../debug/yaml.ts'
import {createDoc} from '../mod.ts'
import {zodPlugin} from '../src/plugins/zod.ts'

setTimeout(() => console.yaml(doc.toDoc()))

export const doc = createDoc({
  // strict: false,
  plugins: {
    schema: [zodPlugin()],
  },

  openapi: '3.1.0',
  info: {
    title: 'Swagger Petstore - OpenAPI 3.1',
    description: '',
    version: '1',
  },

  tags: [
    {
      name: 'pet',
      description: 'Everything about your Pets',
      externalDocs: {
        description: 'Find out more',
        url: 'http://swagger.io',
      },
    },
    {
      name: 'store',
      description: 'Access to Petstore orders',
      externalDocs: {
        description: 'Find out more about our store',
        url: 'http://swagger.io',
      },
    },
    {
      name: 'user',
      description: 'Operations about user',
    },
  ],
})

doc.server({url: 'https://petstore31.swagger.io/api/v3'})

//////////////////////////////// Auth
const petstoreAuth = doc.addSecuritySchema.oauth2('petstore_auth', {
  implicit: {
    authorizationUrl: 'https://petstore3.swagger.io/oauth/authorize',
    scopes: {
      'write:pets': 'modify pets in your account',
      'read:pets': 'read your pets',
    },
  },
})

const apiKey = doc.addSecuritySchema.apiKey('api_key', 'header', 'api_key')

//////////////////////////////// Schemas
const Pet = z.object({})
const Error = z.object({})

const Order = z.object({
  id: z.int().meta({examples: [10]}),
  petId: z.int().meta({examples: [198772]}),
})

doc.addSchema('Pet', Pet)
doc.addSchema('Error', Error)

//////////////////////////////// Paths
doc
  .addPath('/pet') //
  .put((t) => {
    t.tag('pet')
    t.summary('Update an existing pet.')
    t.describe('Update an existing pet by Id.')
    t.operationId('updatePet')

    t.requestBody((t) => {
      t.describe('Update an existent pet in the store')
      t.content('application/json', Pet)
      t.content('application/xml', Pet)
      t.content('application/x-www-form-urlencoded', Pet)
      t.required()
    })

    t.response(200, (t) => {
      t.describe('Successful operation')
      t.content('application/json', Pet)
      t.content('application/xml', Pet)
    })
    t.response(400, (t) => t.describe('Invalid ID supplied'))
    t.response(404, (t) => t.describe('Pet not found'))
    t.response(422, (t) => t.describe('Validation exception'))
    t.response('default', (t) => {
      t.describe('Unexpected error')
      t.content('application/json', Error)
    })

    t.security(petstoreAuth, ['write:pets', 'read:pets'])
  })

  .post((t) => {
    t.tag('pet')
    t.summary('Add a new pet to the store.')
    t.describe('Add a new pet to the store.')
    t.operationId('addPet')

    t.requestBody((t) => {
      t.describe('Create a new pet in the store')
      t.content('application/json', Pet)
      t.content('application/xml', Pet)
      t.content('application/x-www-form-urlencoded', Pet)
      t.required()
    })

    t.response(200, (t) => {
      t.describe('Successful operation')
      t.content('application/json', Pet)
      t.content('application/xml', Pet)
    })
    t.response(400, (t) => t.describe('Invalid ID supplied'))
    t.response(422, (t) => t.describe('Validation exception'))
    t.response('default', (t) => {
      t.describe('Unexpected error')
      t.content('application/json', Error)
    })

    t.security(petstoreAuth, ['write:pets', 'read:pets'])
  })

doc
  .addPath('/pet') //
  .get((t) => {
    t.tag('pet')
    t.summary('Finds Pets by status.')
    t.describe('Multiple status values can be provided with comma separated strings.')
    t.operationId('findPetsByStatus')

    t.parameter('query', 'status', (t) => {
      t.describe('Status values that need to be considered for filter')
      t.required(false)
      t.explode(true)
      t.schema(z.enum(['available', 'pending', 'sold']).default('available'))
    })

    t.response(200, (t) => {
      t.describe('Successful operation')
      t.content('application/json', z.array(Pet))
      t.content('application/xml', z.array(Pet))
    })
    t.response(400, (t) => t.describe('Invalid status value'))
    t.response('default', (t) => {
      t.describe('Unexpected error')
      t.content('application/json', Error)
    })

    t.security(petstoreAuth, ['write:pets', 'read:pets'])
  })
