#!/usr/bin/env -S deno run -A --env-file --watch-hmr

// import {} from '@maks11060/oauth2/client/authorization'
import {parseTokenRequest} from '@maks11060/oauth2/server'
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'
import {parseAuthorizationUrl} from '../src/server/web.ts'


const app = new Hono() //
  .use(cors())
  .use(logger())

app.get('/api', (c) => {
  return c.json({
    headers: c.req.header(),
  })
})

app.get('/authorize', (c) => {
  const authorizeData = parseAuthorizationUrl(c.req.url)
  console.log(authorizeData)

  const redirect_uri = new URL(authorizeData.redirect_uri!)
  redirect_uri.searchParams.set('code', 'CODE')
  if (authorizeData.state) redirect_uri.searchParams.set('state', authorizeData.state)

  return c.redirect(redirect_uri)
})

app.post('/api/oauth2/token', async (c) => {
  const tokenRequest = await parseTokenRequest(c.req.raw.clone())
  console.log(tokenRequest)

  if (tokenRequest.grant_type === 'authorization_code') {
    tokenRequest
  }

  return c.json({
    token_type: 'Bearer',
    access_token: crypto.randomUUID(),
  } satisfies OAuth2Token)
})

if (Deno.env.has('KEY') && Deno.env.has('CERT')) {
  const key = Deno.readTextFileSync(Deno.env.get('KEY')!)
  const cert = Deno.readTextFileSync(Deno.env.get('CERT')!)
  Deno.serve({port: 443, key, cert}, app.fetch)
} else {
  Deno.serve({port: 80}, app.fetch)
}
