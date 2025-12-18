export interface FetchChainOptions {
  /**
   * Custom fetch implementation to use instead of global fetch
   * @default fetch
   */
  fetch?: typeof fetch

  /**
   * Base URL to resolve relative URLs against
   * @default undefined
   */
  baseUrl?: URL | string
}

export interface FetchChain<T extends FetchChainOptions = FetchChainOptions> {
  /**
   * Add middleware to the chain.
   *
   * @param handler - Middleware to add
   * @returns The chain object for chaining
   */
  use(handler: FetchMiddleware<T>): this

  /**
   * Remove middleware from the chain.
   *
   * @param handler - Middleware to remove
   * @returns The chain object for chaining
   */
  eject(handler: FetchMiddleware<T>): this

  /**
   * Execute a fetch request through the middleware chain.
   *
   * @param req - Request info or URL
   * @param init - Request initialization options
   * @returns The response after processing by all middleware
   *
   * @throws If an error occurs during the fetch request and is not handled by middleware
   */
  fetch(req: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

/**
 * Context object shared between all middleware functions for a single request.
 * Can be used to pass data between different stages of the middleware chain.
 */
export interface FetchMiddlewareCtx {
  [key: PropertyKey]: any
}

/**
 * Middleware interface for intercepting and modifying fetch requests and responses.
 * Each method is optional and will be called at the appropriate stage in the request lifecycle.
 *
 * @template T - Type of options object passed to the fetch chain
 */
export interface FetchMiddleware<T extends FetchChainOptions = FetchChainOptions> {
  /**
   * Called before the request is sent. Can modify the request or return a response to short-circuit.
   *
   * @param params - Parameters for the middleware
   * @param params.request - The request object that will be sent
   * @param params.options - Options passed to the fetch chain
   * @param params.ctx - Shared context object for this request
   * @returns
   * - Return a `Request` to replace the request that will be sent
   * - Return a `Response` to short-circuit the request and return that response immediately
   * - Return void/undefined to continue with the (possibly modified) request
   */
  onRequest?({request, options, ctx}: {
    request: Request
    options: T
    ctx: FetchMiddlewareCtx
  }): Promise<Response | Request | void> | Response | Request | void

  /**
   * Called after the response is received. Can modify the response or return a new one.
   *
   * @param params - Parameters for the middleware
   * @param params.request - The original request that was sent
   * @param params.response - The response that was received
   * @param params.options - Options passed to the fetch chain
   * @param params.ctx - Shared context object for this request
   * @returns
   * - Return a Response to replace the response that will be returned
   * - Return void/undefined to continue with the (possibly modified) response
   */
  onResponse?({request, response, options, ctx}: {
    request: Request
    response: Response
    options: T
    ctx: FetchMiddlewareCtx
  }): Promise<Response | void> | Response | void

  /**
   * Called when an error occurs during the fetch request.
   *
   * @param params - Parameters for the middleware
   * @param params.error - The error that occurred
   * @param params.request - The request that caused the error
   * @param params.options - Options passed to the fetch chain
   * @param params.ctx - Shared context object for this request
   * @returns
   * - Return a Response to handle the error by returning that response
   * - Return an Error to replace the error that will be propagated
   * - Return void/undefined to continue with the original error
   */
  onError?({error, request, options, ctx}: {
    error: unknown
    request: Request
    options: T
    ctx: FetchMiddlewareCtx
  }): Promise<Response | Error | void> | Response | Error | void
}

/**
 * Creates a fetch chain with middleware support.
 *
 * @template T - Type of options object
 * @param options - Options to pass to all middleware functions
 * @returns Chain object with methods to configure and execute fetch requests
 *
 * @example
 * const api = Fetch({baseUrl: 'https://api.example.com'})
 *   .use({
 *     onRequest({ request, options }) {
 *       // Add authorization header
 *       request.headers.set('Authorization', 'Bearer token')
 *     },
 *     onResponse({ response }) {
 *       // Log response status
 *       console.log(`Response: ${response.status}`)
 *     }
 *   })
 *
 * const response = await api.fetch('/users')
 */
export const Fetch = <T extends FetchChainOptions>(
  options: T = {} as T,
): FetchChain<T> => {
  const middleware: FetchMiddleware<T>[] = []
  const _fetch = options?.fetch ?? fetch

  return {
    use(handler: FetchMiddleware<T>) {
      middleware.push(handler)
      return this
    },

    eject(handler: FetchMiddleware<T>) {
      const index = middleware.indexOf(handler)
      if (index !== -1) middleware.splice(index, 1)
      return this
    },

    async fetch(req: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      let request: Request
      if (req instanceof Request) request = req
      else {
        // relative uri
        if (options?.baseUrl) {
          const baseUrl = new URL(options?.baseUrl)
          if (typeof req === 'string' && !req.startsWith('http')) {
            req = new URL(req, baseUrl)
          } else if (req instanceof URL) {
            req = new URL(req, baseUrl)
          }
        }

        request = new Request(req, init)
      }

      let response: Response | undefined
      const ctx = {} // Shared context for a single request

      // request
      for (const m of middleware) {
        const result = await m?.onRequest?.({request, options, ctx})
        if (result) {
          if (result instanceof Request) {
            request = result
          } else if (result instanceof Response) {
            return result
          }
        }
      }

      // fetch
      if (!response) {
        const requestClone = request.clone() // save before read body
        try {
          response = await _fetch(request)
          // response = await _fetch(middleware.length ? request.clone() : request)
        } catch (e) {
          let errorAfterMiddleware = e

          // onError
          for (let i = middleware.length; i > 0; i--) {
            const m = middleware[i - 1]
            const result = await m?.onError?.({
              error: errorAfterMiddleware,
              request: requestClone,
              options,
              ctx,
            })
            if (result) {
              if (result instanceof Response) {
                errorAfterMiddleware = undefined
                response = result
                break
              }

              if (result instanceof Error) {
                errorAfterMiddleware = result
                continue
              }

              throw new Error('onError: must return new Response() or instance of Error')
            }
          }

          // rethrow error if not handled by middleware
          if (errorAfterMiddleware) throw e
          if (!response) throw new Error('onError: must return new Response() or instance of Error')
        }

        // response
        for (let i = middleware.length; i > 0; i--) {
          const m = middleware[i - 1]
          const result = await m?.onResponse?.({
            request: requestClone,
            response,
            options,
            ctx,
          })
          if (result) {
            if (!(result instanceof Response)) {
              throw new Error('onResponse: must return new Response() when modifying the response')
            }
            return result
          }
        }

        return response
      }

      throw new Error('')
    },
  }
}
