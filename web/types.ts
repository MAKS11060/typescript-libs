export interface CustomFetch {
  /**
   * Provide your {@linkcode fetch}
   */
  // fetch?: typeof fetch
  fetch?: (input: URL | Request | string, init?: RequestInit) => Promise<Response>
  // fetch?: (input: Request, init?: RequestInit) => Response | Promise<Response>
}
