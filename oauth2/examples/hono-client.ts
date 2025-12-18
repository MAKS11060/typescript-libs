#!/usr/bin/env -S deno run -A --env-file --watch

import {createGithubOauth2, oauth2Authorize, OAuth2Error, oauth2ExchangeCode, usePKCE} from '@maks11060/oauth2'
import {Hono} from 'hono'
import {logger} from 'hono/logger'

const stateStore = new Map<string, {codeVerifier?: string}>()
const config = createGithubOauth2({
  clientId: Deno.env.get('GITHUB_CLIENT_ID')!,
  clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET')!,
  redirectUri: Deno.env.get('OAUTH2_REDIRECT')!,
})

const app = new Hono() //
  .use(logger())
  .get('/login', (c) => {
    const state = crypto.randomUUID()
    const uri = oauth2Authorize(config, {state})
    stateStore.set(state, {})

    console.log({uri: uri.toString()})
    return c.redirect(uri)
  })
  // login with pkce
  .get('/login/pkce', async (c) => {
    const state = crypto.randomUUID()
    const {uri, codeVerifier} = await usePKCE(oauth2Authorize(config, {state}))
    stateStore.set(state, {codeVerifier})

    console.log({uri: uri.toString(), codeVerifier})
    return c.redirect(uri)
  })
  .get('/api/oauth2/callback', async (c) => {
    const code = c.req.query('code')!
    const state = c.req.query('state')!
    if (!stateStore.has(state)) return c.redirect('/?error=invalid_state')
    const {codeVerifier} = stateStore.get(state)!
    stateStore.delete(state)

    try {
      const token = await oauth2ExchangeCode(config, {code, codeVerifier})
      return c.json({token})
    } catch (e) {
      console.error(e)
      if (e instanceof OAuth2Error) return c.json(e)
      return c.json({error: 'OAuth2 login failed'})
    }
  })

if (Deno.env.has('KEY') && Deno.env.has('CERT')) {
  const key = Deno.readTextFileSync(Deno.env.get('KEY')!)
  const cert = Deno.readTextFileSync(Deno.env.get('CERT')!)
  Deno.serve({port: 443, key, cert}, app.fetch)
} else {
  Deno.serve({port: 80}, app.fetch)
}
