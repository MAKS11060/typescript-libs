#!/usr/bin/env -S deno run -A --watch-hmr

import {Hono} from 'hono'
import {createProxyFetch} from './proxy.ts'

const app = new Hono() //
  .use(async (c, next) => {
    console.log(c.req.url)
    console.log(c.req.header())
    await next()
    return c.text('ok')
  })

const proxyFetch = createProxyFetch({
  proxyUrl: 'https://no-cors.deno.dev',
  fetch: app.fetch,
  // param: 'uri',
})

// const res = await proxyFetch('http://localhost/abc')
// const res = await proxyFetch('https://cdn.donmai.us/original/3c/4f/__yumemizuki_mizuki_genshin_impact_drawn_by_tokitamago_tokita_mago1__3c4ff8f54e5764c113b4bb20845f859f.jpg')
const res = await proxyFetch(
  new Request('http://localhost/abc')
)
console.log(res.url)
console.log(await res.text())
