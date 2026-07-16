const decoder = new TextDecoder()

const SOCKS4_VER = 4
const SOCKS5_VER = 5

export const probeProto = (buf: Uint8Array<ArrayBuffer>) => {
  const view = new DataView(buf.buffer)

  // SOCKS4
  if (view.getUint8(0) === SOCKS4_VER) return 'socks4'

  // SOCKS5
  if (view.getUint8(0) === SOCKS5_VER) return 'socks5'

  // http / ws
  const firstByte = view.getUint8(0)
  if (firstByte === SOCKS4_VER) return 'socks4'
  if (firstByte === SOCKS5_VER) return 'socks5'

  // ASCII: G=71, P=80, O=79, D=68, H=72, U=85, C=67
  if ([71, 80, 79, 68, 72, 85, 67].includes(firstByte)) {
    const text = decoder.decode(buf)

    const headerEndIndex = text.indexOf('\r\n\r\n')
    const headersText = headerEndIndex !== -1 ? text.substring(0, headerEndIndex) : text

    const hasUpgradeToken = /^[ \t]*connection[ \t]*:[ \t]*.*?\bupgrade\b/im.test(headersText)
    const hasWebsocketToken = /^[ \t]*upgrade[ \t]*:[ \t]*.*?\bwebsocket\b/im.test(headersText)

    if (hasUpgradeToken && hasWebsocketToken) {
      return 'websocket'
    }

    if (headersText.includes('HTTP/1.')) {
      return 'http'
    }
  }

  return null
}
