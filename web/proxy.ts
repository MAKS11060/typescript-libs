import { CustomFetch } from './types.ts'

interface ProxyFetchOptions extends CustomFetch {
  proxyUrl: string
}

export const createProxyFetch = (options: ProxyFetchOptions) => {
  const _fetch = options.fetch ?? fetch
  const proxyUri = new URL(options.proxyUrl)

  return (input: URL | Request | string, init?: RequestInit) => {
    let _req!: Request

    if (typeof input === 'string' || input instanceof URL) {
      _req = new Request(new URL(`/${input}`, proxyUri))
    } else if (input instanceof Request) {
      _req = new Request(new URL(`/${input.url}`, proxyUri), init)
    }

    return _fetch(_req)
  }
}

// const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev'})
// proxyFetch('https://example.com/') // https://no-cors.deno.dev/https://example.com
