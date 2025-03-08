#!/usr/bin/env -S deno run -A --watch-hmr

import type {StandardSchemaV1} from '@standard-schema/spec'
import {z} from 'zod'
import {} from 'npm:openapi3-ts/oas31'


z

interface OpenApiConfig {
  version: string
}

const createOpenApiSchema = <S extends StandardSchemaV1>(config: OpenApiConfig) => {
  config.version

  const registerResponse = () => {}

  type RequestOptions = {
    body?: any
    query?: any
    params?: any
    cookies?: any
    headers?: any
  }

  type ResponseType = 'application/json'
  type ResponseOptions = {
    description: string
    schema?: any
  }

  const methodsHandler = {
    request: (options?: RequestOptions) => {
      return methodsHandler
    },
    response: (status: number, type: ResponseType, options?: ResponseOptions) => {
      return methodsHandler
    },
  }

  type MethodOptions = {
    tags?: string[]
  }

  return {
    paths: {
      get: (path: string, options?: MethodOptions) => {
        return methodsHandler
      },
      post: (path: string, options?: MethodOptions) => {
        return methodsHandler
      },
    },
  }
}

//
const openApiSchema = createOpenApiSchema({version: '3.1.0'})

openApiSchema.paths //
  .get('/posts')
  .request({})
  .response(200, 'application/json', {description: 'Show posts'})
  .response(400, 'application/json', {description: 'Error'})
