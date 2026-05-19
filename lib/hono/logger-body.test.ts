import {Hono} from 'hono'
import {cors} from 'hono/cors'
import {logger} from 'hono/logger'
import {loggerBody} from './logger-body.ts'

const app = new Hono()
  .use(cors())
  .use(logger())
  .use(loggerBody())
  .post('/hello', async (c) => {
    return c.json(
      await c.req.json(),
      200,
    )
  })

Deno.test('Test 243497', async (t) => {
  const payload = {
    ts: new Date(),
    id: crypto.randomUUID(),
  }
  const res = await app.request('/hello', {
    method: 'POST',
    body: JSON.stringify(payload, null, 2),
  })
  await res.json()
})
