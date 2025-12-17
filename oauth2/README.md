# OAuth2

Client library for the `OAuth2`

## Features

- **Authorization Grant**
  - Authorization Code
  - Client Credentials
  - Implicit
- Supported `PKCE` [(Proof Key for Code Exchange)](https://datatracker.ietf.org/doc/html/rfc7636)
- Helpers for working with tokens
  - {@linkcode isTokenExpired}
  - {@linkcode normalizeOAuth2Token}
- Error handling

Create authorization link

```ts
import {createGithubOauth2, oauth2Authorize} from '@maks11060/oauth2'

const config = createGithubOauth2({
  clientId: Deno.env.get('GITHUB_CLIENT_ID')!,
  clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET')!,
  redirectUri: Deno.env.get('OAUTH2_REDIRECT')!,
})

const state = crypto.randomUUID()
const uri = oauth2Authorize(config, state)
console.log(uri.toString()) // https://github.com/login/oauth/authorize?response_type=code&client_id=0000&state=0000000
```

Exchange the callback code for a token

```ts
import {oauth2ExchangeCode} from '@maks11060/oauth2'

const code = '12365467890' // from query params
const token = await oauth2ExchangeCode(config, {code})
console.log(token)
```

Hono example

```ts
#!/usr/bin/env -S deno run -A --env-file --watch

import {Hono} from 'hono'
import {logger} from 'hono/logger'
import {createGithubOauth2, oauth2Authorize, OAuth2Exception, oauth2ExchangeCode, usePKCE} from '@maks11060/oauth2'

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
    const uri = oauth2Authorize(config, state)
    stateStore.set(state, {})

    console.log({uri: uri.toString()})
    return c.redirect(uri)
  })
  .get('/login/pkce', async (c) => {
    const state = crypto.randomUUID()
    const {uri, codeVerifier} = await usePKCE(oauth2Authorize(config, state))
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
      if (e instanceof OAuth2Exception) {
        console.error(e.message)
        return c.json({error: e.error, message: e.message})
      }
      console.error(e)
      return c.json({error: 'OAuth2 login failed'})
    }
  })

Deno.serve(app.fetch)
```

Helper for creating configurations

```ts
// providers/example.ts
import {CreateOAuth2Config} from '@maks11060/oauth2'

const createExampleConfig: CreateOAuth2Config<{
  clientId: string
  clientSecret: string
  redirectUri: string | URL
  scope: string | string[]
}> = (config) => ({
  clientId: config.clientId,
  clientSecret: config.clientSecret,
  redirectUri: config.redirectUri.toString(),
  authorizeUri: 'https://example.com/oauth2/authorize',
  tokenUri: 'https://example.com/api/oauth2/token',
  scope: config.scope,
})
```

<!--
# OAuth2 library

## Features

- **Client**
  - **Authorization Grant**
    - Authorization Code
    - Client Credentials
    - Implicit

- **TODO**
  - **Server**
    - tools for create oauth2 'app'
 -->