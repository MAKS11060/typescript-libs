import {hHelpers, hono} from "./deps.ts"

export const useSocket = (handler: (socket: WebSocket, c: hono.Context) => void, options?: Deno.UpgradeWebSocketOptions) => {
  return hHelpers.createMiddleware(async (c, next) => {
    if (c.req.header('upgrade') !== 'websocket') {
      await next()
      return
    }

    const {socket, response} = Deno.upgradeWebSocket(c.req.raw, options)
    handler(socket, c)
    return response
  })
}
