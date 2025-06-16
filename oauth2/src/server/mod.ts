import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'

type AuthorizationCodeFlow = {
  response_type: 'code'
  client_id: string
  redirect_uri: string
  scope?: string
  state?: string
}

type ImplicitFlow = {
  response_type: 'token'
  client_id: string
  redirect_uri?: string
  scope?: string
  state?: string
}

const isCodeFlow = (val: {response_type?: string}): val is AuthorizationCodeFlow => {
  return val.response_type === 'code'
}
const isImplicitFlow = (val: {response_type?: string}): val is ImplicitFlow => {
  return val.response_type === 'token'
}

////////////////////////////////////////////////////////////////////////////////////////////
// interface Handler {
//   authorizationCode: (t: AuthorizationCodeCtx) => void
// }
// interface AuthorizationCodeCtx {}

// const createHandler = (init: Handler) => {}

// createHandler({
//   authorizationCode: (t) => {},
// })

////////////////////////////////////////////////////////////////////////////////////////////
interface OAuth2Service {
}

const createOAuth2Service = (): OAuth2Service => {
  return {}
}

////////////////////////////////////////////////////////////////////////////////////////////
const oauth2Hono = (service: OAuth2Service) => {
  return createMiddleware(async (c, next) => {
    const query = c.req.query()

    // c.req.
    await next()
  })
}

//////////////////////////////////////////////////////////////////////////
const oAuth2Service = createOAuth2Service({
  code: (t) => {
  },
})

const app1 = new Hono() //
  .get('/oauth2/authorize', oauth2Hono(oAuth2Service))
  .post('/api/oauth2/token', oauth2Hono(oAuth2Service))

////////////////////////////////////////////////////////////////////////////////////////////

// const app = new Hono() //
//   .get('/oauth2/authorize', (c) => {
//     const data = c.req.query()

//     if (isCodeFlow(data)) {
//       if (data.response_type !== 'code') return c.json({error: 'invalid_request'} satisfies OAuth2Error)
//     }

//     if (isImplicitFlow(data)) {
//     }

//     return c.redirect('/')
//   })
//   .post('/api/oauth2/token', (c) => {
//     return c.json({
//       access_token: crypto.randomUUID(),
//       refresh_token: 'Bearer',
//       expires_in: 3600,
//       token_type: 'Bearer',
//     })
//   })

// // Test
// // authorize.test({
// //   response_type: 'code',
// //   client_id: '',
// //   redirect_uri: '',
// //   scope: '',
// //   state: '1',
// // })
