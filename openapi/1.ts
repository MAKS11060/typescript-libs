#!/usr/bin/env -S deno run -A --watch

import {OpenApiBuilder, OpenAPIObject} from 'npm:openapi3-ts/oas31'

type RequestOptions = {
  body?: any
  query?: any
  params?: any
  cookies?: any
  headers?: any
}
type ResponseType = 'application/json'

type ResponseOptions = {
  description?: string
  schema?: any
}
type MethodOptions = {
  tags?: string[]
}

const createOpenApi = (doc: OpenAPIObject) => {
  const openapi = OpenApiBuilder.create(doc)

  const methodsHandler = {
    // request: (options?: RequestOptions) => {
    //   return methodsHandler
    // },
    response: (status: number, type: ResponseType, options?: ResponseOptions) => {
      return methodsHandler
    },
  }

  openapi.addPath('', {
  })

  const handler = {
    openapi,
    paths: {
      get: (path: string, options?: MethodOptions) => {
        return methodsHandler
      },
      post: (path: string, options?: MethodOptions) => {
        return methodsHandler
      },
    },
  }
  return handler
}

// openapi
//   .addSchema('Posts', {})

//   .addPath('/posts', {
//     parameters: [
//       {
//         in: 'query',
//         name: 'query1',
//         content: {
//           'application/json': {
//             schema: {
//               $ref: '#/components/schemas/Posts',
//             },
//           },
//         },
//       },
//     ],
//     get: {
//       responses: {
//         200: {
//           content: {
//             'application/json': {},
//           },
//         },
//       },
//     },
//   })

//
const {openapi, paths} = createOpenApi({openapi: '3.1.0', info: {title: 'test', version: ''}})

paths //
  .get('/posts')
  .response(200, 'application/json', {description: ''})



console.log(openapi.getSpecAsYaml())
