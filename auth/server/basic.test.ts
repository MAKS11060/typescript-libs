import {deepStrictEqual} from 'node:assert/strict'
import {test} from 'node:test'
import {basicAuth, getBasicAuth} from './basic.ts'

test('Test 652402', async (t) => {
  const a = basicAuth({username: 'user', password: 'pass'})
  deepStrictEqual(a, 'Basic dXNlcjpwYXNz')
})

test('Test 705271', async (t) => {
  const cred = getBasicAuth(
    new Request('http://localhost/', {
      headers: {
        authorization: basicAuth({username: 'user', password: 'pass'}),
      },
    }),
  )

  deepStrictEqual(cred, {username: 'user', password: 'pass'})
})
