import { createMiddleware } from 'hono/factory'

function statusColor(status: number) {
  const code = (status / 100) | 0 // 404 => 4
  if (code === 2) return 'green'
  if (code === 3) return 'yellow'
  if (code === 4) return 'red'
  if (code === 5) return 'red'
  return 'white'
}

export const loggerBody = <T = unknown, O = unknown>(
  options: {
    pad?: number
    incoming?: (data: T) => void
    outgoing?: (data: O) => void
  } = {},
) => {
  options.pad ??= 0
  options.incoming ??= console.log
  const {pad} = options
  const padFill = ' '

  return createMiddleware(async (c, next) => {
    try {
      if (['GET', 'HEAD'].includes(c.req.method)) return await next()

      const start = performance.now()
      console.log(`<-- ${c.req.method.padStart(pad, padFill)} %c${c.req.url}`, 'color: green')
      c.req.header('content-type') === 'application/json'
        ? options.incoming!(await c.req.raw.clone().json())
        : console.log(await c.req.raw.clone().text())

      await next()

      if (options.outgoing) {
        c.res.headers.get('content-type')?.startsWith('application/json')
          ? options.outgoing(await c.res.clone().json())
          : console.log(await c.res.clone().text())
      }

      console.log(
        `--> ${c.req.method.padStart(pad, padFill)} %c${c.res.status} %c${c.req.url} %c${
          (
            performance.now() - start
          ).toFixed(3)
        } ms`,
        `color: ${statusColor(c.res.status)}`,
        'color: green',
        'color: blue',
      )
      return
    } catch (e) {
      console.error(e)
    }
    await next()
  })
}
