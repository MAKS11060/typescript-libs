/**
 * A common interface for using your own {@linkcode fetch}
 */
export interface CustomFetch {
  /**
   * Provide your {@linkcode fetch}
   */
  // fetch?: typeof fetch
  fetch?: (input: URL | Request | string, init?: RequestInit) => Promise<Response> | Response
  // fetch?: (input: Request, init?: RequestInit) => Response | Promise<Response>
  // fetch?: {
  //   (input: URL | Request | string, init?: RequestInit): Promise<Response>
  //   // (input: Request, init?: RequestInit): Response | Promise<Response>
  // }
}

/**
 * Wraps a request handler to ensure that it always receives a Request object
 *
 * @example
 * ```ts
 * import {Hono} from 'hono'
 *
 * const app = new Hono().get('/abc', c => c.text('123'))
 * const webFetch = wrapFetch(app.fetch)
 *
 * const res = await webFetch('http://example.com/abc')
 * ```
 */
export const wrapFetch = (
  handler: (req: Request, ...args: any[]) => Response | Promise<Response>
): ((input: URL | Request | string, init?: RequestInit) => Response | Promise<Response>) => {
  return (input: URL | Request | string, init?: RequestInit) => {
    if (input instanceof Request) return handler(input, init)
    return handler(new Request(input, init))
  }
}
