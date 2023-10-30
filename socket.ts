import {hHelpers, hono} from "./deps.ts"

export const useSocket = (handler: (socket: WebSocket, c: hono.Context) => void) => {
  return hHelpers.createMiddleware(async (c, next) => {
    if (c.req.header('upgrade') !== 'websocket') {
      await next()
      return
    }

    const {socket, response} = Deno.upgradeWebSocket(c.req.raw)
    handler(socket, c)
    return response
  })
}
