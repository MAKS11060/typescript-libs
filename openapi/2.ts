#!/usr/bin/env -S deno run -A --watch-hmr


import { OpenApiBuilder, OpenAPIObject, PathItemObject, OperationObject, ReferenceObject, SchemaObject } from "npm:openapi3-ts/oas31";

const openapi = OpenApiBuilder.create({openapi: '3.1', info: {title: 'Test', version: '1'}})

openapi.addPath('/posts', {
  get: {
    description: 'Get posts',
    responses: {
      200: {
        description: 'Posts list',
        content: {
          'application/json': {
            schema: {},
          },
        },
      },
      404: {
        description: 'Posts not found',
        content: {
          'application/json': {
            schema: {},
          },
        },
      },
    },
  },
})

const createMyOpenApi = (doc: OpenAPIObject) => {
  const openapi = OpenApiBuilder.create(doc)
  return {} as any
}

const myOpenapi = createMyOpenApi({openapi: '3.1', info: {title: 'Test', version: '1'}})

const NotFoundRef = myOpenapi.addSchema('NotFound', {schema: {}})

myOpenapi
  .addPath('/posts')
  .get({description: 'Get posts'})
  .response(200, 'application/json', {schema: {}})
  .response(404, 'application/json', {schema: NotFoundRef})

  .post({description: 'Create post'})
  .response(200, 'application/json', {schema: {}})

myOpenapi
  .addPath('/posts/{id}', {
    params: {id: {schema: {}}},
  })
  .get({description: 'Get post'})
  .response(200, 'application/json', {schema: {}})
