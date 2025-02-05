export interface CustomFetch {
  /**
   * Provide your {@linkcode fetch}
   */
  fetch?: typeof fetch
  // fetch?: (input: Request, init?: RequestInit) => Response | Promise<Response>
}
