#!/usr/bin/env -S deno run -A

import {CustomFetch} from './types.ts'

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

// interface ProxyFetchOptions extends CustomFetch {
//   proxyUrl: string
//   query?: string
//   param?: string
//   header?: string
// }

// export const createProxyFetch = (options: ProxyFetchOptions) => {
//   const _fetch = options.fetch ?? fetch
//   const {query, param, header} = options
//   const proxyUri = new URL(options.proxyUrl)

//   return (input: URL | Request | string, init?: RequestInit) => {
//     let _req: Request
//     let _input!: URL
//     let _requestInit!: RequestInit

//     if (input instanceof Request) {
//       _input = new URL(input.url)
//       _requestInit = {...input, ...init}
//     }

//     _req = new Request(_input, _requestInit)

//     if (header) {
//       _req.headers.set(header, _input.toString())
//     }

//     return _fetch(_req)

//     // if (typeof input === 'string' || input instanceof URL) {
//     //   // url = new URL(input)
//     // } else if (input instanceof Request) {
//     //   // url = new URL(`/${input.url}`, uri)
//     //   requestInit = {...input, ...init}
//     // }

//     // if (param) {
//     //   // Replace the placeholder in the proxy URL with the target URL
//     //   const targetUrl = url.toString()
//     //   url.pathname = decodeURIComponent(url.pathname).replace(`{${param}}`, encodeURIComponent(targetUrl))
//     // }

//     // if (query) {
//     //   url.searchParams.append(query, )
//     // }

//     // if (!query && !header) {
//     //   // Default behavior: append the target URL to the proxy URL
//     //   // url.pathname = `${url.pathname.slice(1)}/${encodeURIComponent(url.toString())}`
//     // }

//     // if (input instanceof URL) {
//     //   // url = isCustomProperty ? uri : new URL(`/${input.pathname}${input.search}`, uri)
//     // } else if (typeof input === 'string') {
//     //   url = isCustomProperty ? uri :new URL(`/${input}`, uri)
//     // } else if (input instanceof Request) {
//     //   url = isCustomProperty ? uri : new URL(`/${input.url}`, uri)
//     //   requestInit = {...input, ...init}
//     // }

//     // if (query) {
//     //   // Add the target URL as a query parameter
//     //   url.searchParams.append(query, input.toString())
//     // } else if (param) {
//     //   // Replace the placeholder in the proxy URL with the target URL
//     //   const targetUrl = input.toString()
//     //   url.pathname = url.pathname.replace(`{${param}}`, encodeURIComponent(targetUrl))
//     // } else {
//     //   // Default behavior: append the target URL to the proxy URL
//     //   url.pathname = `${url.pathname}/${encodeURIComponent(input.toString())}`
//     // }

//     // if (header) {
//     //   // Add the target URL to the headers
//     //   requestInit = requestInit || {}
//     //   requestInit.headers = {
//     //     ...(requestInit.headers || {}),
//     //     [header]: url.toString(),
//     //   }
//     // }

//     // const request = new Request(url, requestInit)
//     // return _fetch(request)
//   }
// }

// const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev'})
// proxyFetch('https://hdrezka.me/') // https://no-cors.deno.dev/https://hdrezka.me

// const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev', query: 'target'})
// proxyFetch('https://hdrezka.me/') // https://no-cors.deno.dev/?target=https://hdrezka.me

// const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev/{param}', param: 'target'})
// proxyFetch('https://hdrezka.me/') // https://no-cors.deno.dev/https://hdrezka.me

// const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev/{param}', header: 'x-proxy-url'}) // add uri in headers

// const res = await proxyFetch('https://hdrezka.me/')

// console.log(res.headers)
