// interface OAuth2Server {}

import { oauth2Implicit } from '@maks11060/oauth2'
import { oauth2Authorize } from '@maks11060/oauth2/authorization'
import { expect } from 'jsr:@std/expect/expect'
import { ErrorMap, OAuth2Exception } from '../error.ts'
import { OAuth2TokenResponse } from '../oauth2.ts'

interface OAuth2ClientApp {
  type: 'confidential' | 'public'
  client_id: string
  client_secret: string
  redirect_uri: Set<string>
  app_name: string
  scopes?: string[]
}

interface OAuth2ServerAppService {
  get(client_id: string): OAuth2ClientApp | void
}

////////////////////////////////
type ResponseType = 'code' | 'token'
type GrantType = 'client_credentials' | 'authorization_code' | 'refresh_token' | 'password'

const isResponseType = (type: unknown): type is ResponseType => {
  const expected = ['code', 'token']
  return expected.includes(String(type))
}

const isGrantType = (type: unknown): type is GrantType => {
  const expected = [
    'client_credentials',
    'authorization_code',
    'refresh_token',
    'password',
  ]
  return expected.includes(String(type))
}

const getRedirectUri = (app: OAuth2ClientApp, redirect_uri: string | null): URL => {
  if (redirect_uri) {
    if (!app.redirect_uri.has(redirect_uri)) {
      throw new Error('Invalid redirect_uri: not registered for this client')
    }
    return new URL(redirect_uri)
  }

  // use default redirect
  if (app.redirect_uri.size === 1) {
    const uri = app.redirect_uri.values().take(1).toArray()[0]
    return new URL(uri)
  }

  throw new Error('missing redirect_uri')
}

const createOAuth2Server = (options: {
  clients: OAuth2ServerAppService
  grant: {
    authorizationCode?: {
      generate(client: OAuth2ClientApp, uri: URL): string
      verify(client: OAuth2ClientApp, uri: URL): unknown
    }
    implicit?: {
      authorize(client: OAuth2ClientApp, uri: URL): string
    }
    // clientCredentials?: {}
    // password?: {}
  }
}) => {
  return {
    authorize(uri: URL) {
      // console.log('params', Object.fromEntries(uri.searchParams.entries()))

      const response_type = uri.searchParams.get('response_type')
      if (!isResponseType(response_type)) throw new OAuth2Exception(ErrorMap.invalid_request)

      const client_id = uri.searchParams.get('client_id')
      if (!client_id) throw new OAuth2Exception(ErrorMap.invalid_request)

      const client = options.clients.get(client_id)
      if (!client) throw new OAuth2Exception(ErrorMap.unauthorized_client)

      const state = uri.searchParams.get('state')

      if (response_type === 'code') {
        const res = getRedirectUri(client, uri.searchParams.get('redirect_uri'))

        if (!options.grant.authorizationCode) throw new OAuth2Exception(ErrorMap.unsupported_response_type)
        const code = options.grant.authorizationCode.generate(client, uri)

        res.searchParams.set('code', code)
        if (state) res.searchParams.set('state', state)

        return res
      } else if (response_type === 'token') {
        if (!options.grant.implicit) throw new OAuth2Exception(ErrorMap.unsupported_response_type)

        // const res = options.grant.implicit.authorize(client, uri)

        const res = getRedirectUri(client, uri.searchParams.get('redirect_uri'))
        const body = new URLSearchParams({
          access_token: 'TOKEN',
          token_type: 'Bearer',
          expires_in: String(3600),
          scope: '',
          ...(state && {state}),
        })

        res.hash = body.toString()

        return res
      }

      throw new OAuth2Exception(ErrorMap.server_error)
    },

    /** Exchange code to token */
    token(uri: URL): OAuth2TokenResponse {
      const grant_type = uri.searchParams.get('grant_type')
      if (!isGrantType(grant_type)) throw new OAuth2Exception(ErrorMap.unsupported_grant_type)
      // error invalid_grant_type

      uri.searchParams.get('client_id')
      uri.searchParams.get('code')

      grant_type === 'client_credentials'

      uri.searchParams.get('client_secret')
    },
  }
}

Deno.test('createOAuth2Server()', async (t) => {
  const clients: OAuth2ClientApp[] = [{
    type: 'confidential',
    client_id: '1234',
    client_secret: 'secret',
    app_name: 'test',
    redirect_uri: new Set([
      'http://localhost/api/oauth2/callback',
    ]),
  }]

  const oauth2Server = createOAuth2Server({
    clients: {
      get(client_id) {
        const client = clients.find((v) => v.client_id === client_id)
        if (!client) return
        return client
      },
    },
    grant: {
      authorizationCode: {
        generate(client, uri) {
          return 'CODE'
        },
        verify(client, uri) {
        },
      },
      implicit: {
        authorize(client, uri) {
          return ''
        },
      },
    },
  })

  await t.step('oauth2Authorize()', async (t) => {
    // client
    const authorizeUri = oauth2Authorize({
      clientId: '1234',
      clientSecret: 'SECRET',
      authorizeUri: 'http://localhost/authorize',
      tokenUri: 'http://localhost/token',
      redirectUri: 'http://localhost/api/oauth2/callback',
    }, 'STATE')

    // server
    const authUri = oauth2Server.authorize(authorizeUri)

    expect(authUri.toString()).toEqual(
      'http://localhost/api/oauth2/callback?code=CODE&state=STATE',
    )

    console.log(oauth2Server.token(authUri))
  })

  await t.step('oauth2Implicit()', async (t) => {
    const authUri = oauth2Server.authorize(oauth2Implicit({
      clientId: '1234',
      clientSecret: 'SECRET',
      authorizeUri: 'http://localhost/authorize',
      tokenUri: 'http://localhost/token',
      redirectUri: 'http://localhost/api/oauth2/callback',
      scope: 'abc',
    }, 'STATE2'))
    expect(authUri?.toString()).toEqual(
      'http://localhost/api/oauth2/callback#access_token=TOKEN&token_type=Bearer&expires_in=3600&scope=&state=STATE2',
    )
  })
})
