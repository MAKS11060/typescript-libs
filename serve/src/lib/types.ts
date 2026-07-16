import {SOCKS4} from '../protocol/socks4.ts'
import {SOCKS5} from '../protocol/socks5.ts'
import {WebSocketStream} from '../protocol/ws-stream.ts'

export interface ServeHandler {
  connect(request: ServeConnectRequest): Promise<void>
}

export type ServeConnectRequestBase = {
  remoteAddress: Deno.NetAddr
}

// #region custom
export type ServeConnectRequestUnknown = {
  connectProtocol: 'unknown'
  accept(): {
    readable: ReadableStream
    writable: WritableStream
  }
}
// #endregion

// #region socks4
export type ServeConnectRequestSocks4 = {
  connectProtocol: 'socks4'
  /**
   * Upgrade an incoming TCP request to a socks4
   */
  upgradeSocks4(): SOCKS4
}
// #endregion

// #region socks5
export type ServeConnectRequestSocks5 = {
  connectProtocol: 'socks5'
  /**
   * Upgrade an incoming TCP request to a socks5
   */
  upgradeSocks5(): SOCKS5
}
// #endregion

// #region websocket
export type ServeConnectRequestWebSocket = {
  connectProtocol: 'websocket'
  /**
   * Upgrade an incoming TCP request to a socks5
   */
  upgradeWebSocketStream(): WebSocketStream
}
// #endregion

export type ServeConnectRequest =
  & ServeConnectRequestBase
  & (
    | ServeConnectRequestUnknown
    | ServeConnectRequestSocks4
    | ServeConnectRequestSocks5
    | ServeConnectRequestWebSocket
  )

export interface ServeOptions {
  port: number
  hostname?: string
  signal?: AbortSignal
}
