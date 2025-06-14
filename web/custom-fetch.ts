import type { CustomFetch } from './types.ts'

type ClientMethods = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

type ParsePath<T extends string> = T extends `${string}{${infer P}}${infer Rest}` //
  ? P | ParsePath<Rest>
  : never

interface ClientOptions extends CustomFetch {
  basePath?: URL | string
}

interface ClientRequestOptions<P extends string> {
  params?: Record<ParsePath<P>, string>
  query?: URLSearchParams | Iterable<string[]> | Record<string, string> | string
  body?: unknown
}

export interface ClientMiddleware {
  onRequest?(req: Request): Request | Promise<Request>
  onResponse?(res: Response): Response | Promise<Response>
}

export const createClient = (init?: ClientOptions) => {
  let middlewares: ClientMiddleware[] = []

  const _fetch = init?.fetch ?? fetch

  const makeRequest = async <P extends string>(method: ClientMethods, path: P, options: ClientRequestOptions<P>) => {
    const resolvedPath = path.replace(/{(\w+)}/g, (_, param) => {
      if (options.params && options.params[param as ParsePath<P>]) {
        return options.params[param as ParsePath<P>]
      }
      throw new Error(`Missing parameter: ${param}`)
    })
    const query = options.query instanceof URLSearchParams ? options.query : new URLSearchParams(options.query)
    const url = new URL(resolvedPath, init?.basePath ?? globalThis.location.origin)
    url.search = query.toString()

    const requestInit: RequestInit = {
      method,
      headers: options.body instanceof FormData ? {} : {'Content-Type': 'application/json'},
    }

    let request = new Request(url.toString(), requestInit)
    // Apply middleware for request
    for (const middleware of middlewares) {
      if (middleware.onRequest) {
        request = middleware.onRequest.constructor.name === 'AsyncFunction'
          ? await middleware.onRequest(request)
          : (middleware.onRequest(request) as any)
      }
    }

    let response = await _fetch(request)

    // Apply middleware for response
    for (const middleware of middlewares) {
      if (middleware.onResponse) {
        response = middleware.onResponse.constructor.name === 'AsyncFunction'
          ? await middleware.onResponse(response)
          : (middleware.onResponse(response) as any)
      }
    }

    return {
      response,
      text: () => response.text(),
      json: <T>() => response.json() as T,
      blob: () => response.blob(),
      bytes: () => response.bytes(),
      formData: () => response.formData(),
    }
  }

  const client = {
    use: (middleware: ClientMiddleware) => middlewares.push(middleware),
    eject: (middleware: ClientMiddleware) => (middlewares = middlewares.filter((v) => v !== middleware)),
    GET: <P extends string>(path: P, options: ClientRequestOptions<P>) => makeRequest('GET', path, options),
    PUT: <P extends string>(path: P, options: ClientRequestOptions<P>) => makeRequest('PUT', path, options),
    POST: <P extends string>(path: P, options: ClientRequestOptions<P>) => makeRequest('POST', path, options),
    PATCH: <P extends string>(path: P, options: ClientRequestOptions<P>) => makeRequest('PATCH', path, options),
    DELETE: <P extends string>(path: P, options: ClientRequestOptions<P>) => makeRequest('DELETE', path, options),
  }

  return client
}
