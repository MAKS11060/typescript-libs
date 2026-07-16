import {probeProto} from '../lib/helper.ts'
import {ServeHandler, ServeOptions} from '../lib/types.ts'
import {SOCKS4} from '../protocol/socks4.ts'
import {SOCKS5} from '../protocol/socks5.ts'
import {WebSocketStream} from '../protocol/ws-stream.ts'

const serveHandler = async (conn: Deno.Conn, handler: ServeHandler) => {
  const {readable} = conn
  const reader = readable.getReader()

  const {done, value: chunk} = await reader.read()
  if (done) {
    reader.cancel()
    conn.close()
    return
  }

  // console.log(chunk)
  const protocol = probeProto(chunk)

  // #region socks4
  if (protocol === 'socks4') {
    await handler.connect({
      connectProtocol: 'socks4',
      remoteAddress: conn.remoteAddr as Deno.NetAddr,
      upgradeSocks4() {
        reader.releaseLock()

        return new SOCKS4({conn, chunk})
      },
    })
  }
  // #endregion

  // #region socks5
  if (protocol === 'socks5') {
    const view = new DataView(chunk.buffer)
    const supportedAuthMethodN = view.getUint8(1)
    const clientSupportedAuth: Set<number> = new Set()
    for (let i = 0; i < supportedAuthMethodN; i++) {
      const authMethod = view.getUint8(2 + i)
      clientSupportedAuth.add(authMethod)
    }

    await handler.connect({
      connectProtocol: 'socks5',
      remoteAddress: conn.remoteAddr as Deno.NetAddr,
      upgradeSocks5() {
        reader.releaseLock()

        return new SOCKS5({conn, clientSupportedAuth})
      },
    })
  }
  // #endregion

  // #region
  if (protocol === 'websocket') {
    await handler.connect({
      connectProtocol: 'websocket',
      remoteAddress: conn.remoteAddr as Deno.NetAddr,
      upgradeWebSocketStream() {
        reader.releaseLock()

        return new WebSocketStream({conn, chunk})
      },
    })
  }
  // #endregion
}

export const serve = async (handler: ServeHandler, options: ServeOptions) => {
  const listener = Deno.listen(options)
  options.signal?.addEventListener('abort', () => listener.close())

  for await (const conn of listener) {
    try {
      serveHandler(conn, handler).catch((e) => {
        console.error(e)
      })
    } catch (e) {
      console.error(e)
    }
  }
}
