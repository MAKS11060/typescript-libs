import { expect } from 'jsr:@std/expect/expect'
import { oauth2Implicit } from './implicit.ts'

Deno.test('oauth2Implicit()', () => {
  const res = oauth2Implicit({
    clientId: 'ID',
    clientSecret: 'SECRET',
    redirectUri: 'http://localhost/callback',
    authorizeUri: 'http://localhost/authorize',
    tokenUri: 'http://localhost/token',
    scope: 'a b',
  }, {state: 'STATE'})

  expect(res.toString()).toEqual(
    'http://localhost/authorize?response_type=token&client_id=ID&redirect_uri=http%3A%2F%2Flocalhost%2Fcallback&scope=a+b&state=STATE',
  )
})
