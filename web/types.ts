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

export const wrapFetch = (handler: (req: Request, ...args: any[]) => Response | Promise<Response>) => {
  return (input: URL | Request | string, init?: RequestInit) => {
    if (input instanceof Request) return handler(input, init)
    return handler(new Request(input, init))
  }
}
