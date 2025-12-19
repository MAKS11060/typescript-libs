import {expect} from '@std/expect'
import {Hono} from 'hono'
import {getCookie, setCookie} from 'hono/cookie'
import {createHonoVar} from './hono-var.ts'

const app = new Hono()

const users = new Set<string>([
  'admin',
])

const bytes = createHonoVar({
  randomBytes(c, bytes: number) {
    return crypto.getRandomValues(new Uint8Array(bytes))
  },
})

const rand = createHonoVar(bytes, {
  randomHex(c, bytes: number) {
    return c.var.randomBytes(bytes).toHex()
  },

  randomBase64url(c, bytes: number) {
    return c.var.randomBytes(bytes).toBase64({alphabet: 'base64url'})
  },
})

const session = createHonoVar(rand, {
  createSession(c, username?: string) {
    if (!users.has(username!)) return

    const newSession = c.var.randomBase64url(16)
    setCookie(c, 'session', newSession, {maxAge: 3600})

    return newSession
  },

  getSession(c) {
    const session = getCookie(c, 'session')
    if (!session) return null

    return session
  },
})

const account = createHonoVar(session, {
  registerUser(c, username?: string) {
    if (users.has(username!)) throw new Error(`username ${username} is already used`)

    users.add(username!)

    // create session after register
    const session = c.var.createSession(username)
    return session
  },
})

app.get('/api/auth/login', session, (c) => {
  const username = c.req.query('username')
  const session = c.var.createSession(username)

  if (!session) return c.json('error', 401)
  return c.json('ok')
})

app.get('/api/auth/register', account, (c) => {
  const username = c.req.query('username')
  const session = c.var.registerUser(username)

  if (!session) return c.json('error', 401)
  return c.json('ok')
})

app.get('/api/auth/test', session, (c) => {
  const session = c.var.getSession()
  return c.json({session})
})

app.onError((e, c) => {
  if (e instanceof Error) return c.json(e.message, 500)

  return c.json('error', 500)
})

Deno.test('/login admin', async (t) => {
  const res = await app.request(`/api/auth/login?username=${'admin'}`)
  expect(res.headers.has('set-cookie')).toBeTruthy()
  expect(await res.json()).toEqual('ok')

  await t.step('/login unknown username', async (t) => {
    const res = await app.request(`/api/auth/login?username=${'admin2'}`)
    expect(res.headers.has('set-cookie')).toBeFalsy()
    expect(await res.json()).toEqual('error')
  })

  await t.step('/register user', async (t) => {
    const res = await app.request(`/api/auth/register?username=${'admin2'}`)
    expect(res.headers.has('set-cookie')).toBeTruthy()
    expect(await res.json()).toEqual('ok')
  })

  await t.step('/register user duplicate', async (t) => {
    const res = await app.request(`/api/auth/register?username=${'admin2'}`)
    expect(await res.json()).toEqual('username admin2 is already used')
  })

  await t.step('/login admin2', async (t) => {
    const res = await app.request(`/api/auth/login?username=${'admin2'}`)
    expect(res.headers.has('set-cookie')).toBeTruthy()
    expect(await res.json()).toEqual('ok')
  })
})
