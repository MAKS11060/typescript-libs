import {createServer, Socket} from 'node:net'
import {Readable, Writable} from 'node:stream'
import {probeProto} from '../lib/helper.ts'
import {ServeHandler, ServeOptions} from '../lib/types.ts'
import {SOCKS4} from '../protocol/socks4.ts'
import {SOCKS5} from '../protocol/socks5.ts'

interface DenoNetAddr {
  transport: 'tcp' | 'udp'
  hostname: string
  port: number
}

interface DenoConnAdapter {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  remoteAddr: DenoNetAddr
  close(): void
}

function createDenoConnAdapter(socket: Socket): DenoConnAdapter {
  return {
    readable: Readable.toWeb(socket),
    writable: Writable.toWeb(socket) as WritableStream<Uint8Array>,
    remoteAddr: {
      transport: 'tcp',
      hostname: socket.remoteAddress ?? '0.0.0.0',
      port: socket.remotePort ?? 0,
    },
    close() {
      if (!socket.destroyed) {
        socket.destroy()
      }
    },
  }
}

const serveHandler = async (conn: DenoConnAdapter, handler: ServeHandler) => {
  const {readable, writable} = conn
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
      remoteAddress: conn.remoteAddr,
      upgradeSocks4() {
        reader.releaseLock()

        // Возвращаем ваш класс SOCKS4, он будет работать без изменений
        return new SOCKS4({conn: conn as any, chunk})
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
      remoteAddress: conn.remoteAddr,
      upgradeSocks5() {
        reader.releaseLock()

        return new SOCKS5({conn: conn as any, clientSupportedAuth})
      },
    })
  }

  // #endregion
}

// Новая реализация функции serve для Node.js
export const serve = async (handler: ServeHandler, options: ServeOptions) => {
  const server = createServer((socket) => {
    // Настраиваем сокет для быстрой передачи (отключаем алгоритм Нагла)
    socket.setNoDelay(true)

    // Обертываем сокет Node.js в Deno-совместимый интерфейс
    const conn = createDenoConnAdapter(socket)

    // Запускаем ваш serveHandler так же, как в Deno
    serveHandler(conn, handler).catch((e) => {
      console.error('Error in session handler:', e)
      conn.close()
    })
  })

  // Обработка сигнала отмены (AbortSignal)
  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      server.close()
    }, {once: true})
  }

  // Обработка ошибок самого сервера (например, если порт занят)
  server.on('error', (err) => {
    console.error('Server error:', err)
  })

  // Запуск прослушивания порта
  server.listen(options.port, options.hostname ?? '0.0.0.0', () => {
    console.log(`Server listening on node port: ${options.port}`)
  })
}
