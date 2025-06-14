import { expect } from 'jsr:@std/expect/expect'
import { Hono } from 'npm:hono'
import { oauth2Implicit } from './implicit.ts'

Deno.test('oauth2Implicit', async (t) => {
  const app = new Hono()

  app.get('/authorize', (c) => {
    const responseType = c.req.query('response_type')
    const redirectUri = c.req.query('redirect_uri')
    const clientId = c.req.query('client_id')
    const state = c.req.query('state')
    const scope = c.req.query('scope')

    if (responseType === 'token' && redirectUri) {
      const _redirect = new URL(redirectUri)
      const payload = new URLSearchParams()

      payload.set('access_token', 'xyz')
      payload.set('token_type', 'Bearer')
      payload.set('expires_in', '3600')
      // payload.set('scope', '')
      if (state) payload.set('state', state)

      _redirect.hash = `#${payload.toString()}`
      // _redirect.hash = `#${encodeURIComponent(payload.toString())}`

      return c.redirect(_redirect)
    }

    return c.redirect('/')
  })

  //
  const uri = oauth2Implicit({
    authorizeUri: 'https://example.com/authorize',
    tokenUri: 'https://example.com/token',
    clientId: '01234456789',
    redirectUri: 'https://localhost/callback',
  })
  const res = await app.request(uri)

  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toEqual(
    'https://localhost/callback#access_token=xyz&token_type=Bearer&expires_in=3600',
  )
  // expect(res.headers.get('location')).toEqual(
  // 'https://localhost/callback#access_token%3Dxyz%26token_type%3DBearer%26expires_in%3D3600'
  // )
})
