const encoder = new TextEncoder()
const decoder = new TextDecoder()

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const OPCODES = {
  CONTINUATION: 0x0,
  TEXT: 0x1,
  BINARY: 0x2,
  CLOSE: 0x8,
  PING: 0x9,
  PONG: 0xA,
} as const

// Ограничение для защиты от DoS (например, 16 МБ максимум на сообщение)
const MAX_MESSAGE_SIZE = 16 * 1024 * 1024

// Размер фрагмента по умолчанию — 64 КБ
const DEFAULT_FRAGMENT_SIZE = 64 * 1024 // output

export const genAcceptKey = async (key: string | null) => {
  return new Uint8Array(await crypto.subtle.digest('SHA-1', encoder.encode(key + GUID))).toBase64()
}

export const unmask = (payload: Uint8Array<ArrayBuffer>, mask: Uint8Array<ArrayBuffer>): void => {
  for (let i = 0; i < payload.byteLength; i++) {
    payload[i]! ^= mask[i & 3]!
  }
}

type WebSocketPairReadable =
  | {type: 'text'; data: string}
  | {type: 'arraybuffer'; data: Uint8Array<ArrayBuffer>}
type WebSocketPairWritable =
  | {type: 'text'; data: string}
  | {type: 'arraybuffer'; data: Uint8Array<ArrayBuffer>}
// | {type: 'ping'; data?: Uint8Array<ArrayBuffer>}
// | {type: 'pong'; data?: Uint8Array<ArrayBuffer>}
// | {type: 'close'; code?: number; reason?: string}
type WebSocketPair = {
  readable: ReadableStream<WebSocketPairReadable>
  writable: WritableStream<WebSocketPairWritable>
  headers: Headers
  url: string
}

export class WebSocketStream {
  readonly #conn: Deno.Conn
  readonly #reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>
  readonly #writer: WritableStreamDefaultWriter<Uint8Array<ArrayBuffer>>

  readonly headers: Headers
  readonly url: URL

  opened: Promise<WebSocketPair>

  constructor(options: {conn: Deno.Conn; chunk: Uint8Array<ArrayBuffer>}) {
    this.#conn = options.conn
    this.#reader = this.#conn.readable.getReader()
    this.#writer = this.#conn.writable.getWriter()

    // parse http
    const http = new TextDecoder().decode(options.chunk)
    const httpLines = http.split('\r\n')
    const [method, path, httpVersion] = httpLines[0]?.split(' ') ?? []

    const headers = new Headers()
    this.headers = headers

    for (const line of httpLines.slice(1)) {
      if (!line || line.trim() === '') break // end headers

      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) continue

      const key = line.slice(0, colonIndex).trim()
      const val = line.slice(colonIndex + 1).trim()
      if (key) headers.append(key, val)
    }

    // url
    this.url = new URL(path!, `ws://${headers.get('host') || 'localhost'}`)

    // upgrade
    const {promise, resolve} = Promise.withResolvers<WebSocketPair>()

    this.opened = promise

    this.#reader.releaseLock()
    this.#writer.releaseLock()

    this.#upgradeConnection().then((res) => resolve(res))
  }

  async #upgradeConnection() {
    const secWebsocketKey = this.headers.get('sec-websocket-key')
    if (!secWebsocketKey) {
      this.#conn.close()
      throw new Error('sec-websocket-key header not found')
    }

    const acceptKey = await genAcceptKey(secWebsocketKey)
    const acceptHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      'Sec-WebSocket-Version: 13',
    ]

    // Protocol negotiation
    const proto = this.headers.get('sec-websocket-protocol')
    // if (protocol && proto) {
    //   for (const item of proto.split(',')) {
    //     if (protocol === item.trim()) acceptHeaders.push(`Sec-WebSocket-protocol: ${item}`)
    //   }
    // }

    //
    await this.#conn.write(encoder.encode(acceptHeaders.concat('\r\n').join('\r\n')))

    // ws
    return await this.#getStream()
  }

  async #getStream() {
    const {readable, writable} = this.#conn

    const writer = websocketWriter()
    writer.readable.pipeTo(writable)

    return {
      readable: readable.pipeThrough(websocketReader()),
      writable: writer.writable,
      headers: this.headers,
      url: this.url.toString(),
    }
  }
}

// #region streams

// Функция для склеивания двух Uint8Array
const concatUint8 = (a: Uint8Array<ArrayBuffer>, b: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
  const res = new Uint8Array(a.byteLength + b.byteLength)
  res.set(a, 0)
  res.set(b, a.byteLength)
  return res
}

export const websocketReader = () => {
  // Внутренний буфер для накопления сырых байт из TCP-чанков
  let buffer = new Uint8Array(0)

  // Состояние сборщика фрагментированных сообщений (FIN = 0)
  let messageOpcode: number | null = null
  let messagePayloads: Uint8Array[] = []
  let totalMessageLength = 0

  return new TransformStream<Uint8Array<ArrayBuffer>, WebSocketPairReadable>({
    async transform(chunk, controller) {
      // Добавляем вновь пришедший TCP-кусок в наш аккумулятор
      buffer = concatUint8(buffer, chunk)

      // Крутим цикл, пока в буфере достаточно байт хотя бы для минимального заголовка (2 байта)
      while (buffer.byteLength >= 2) {
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)

        const firstByte = view.getUint8(0)
        const secondByte = view.getUint8(1)

        const fin = (firstByte & 0x80) !== 0
        const opcode = firstByte & 0x0F
        const hasMask = (secondByte & 0x80) !== 0
        let payloadLen = secondByte & 0x7F

        // По RFC 6455 от клиента к серверу ВСЕ фреймы ДОЛЖНЫ быть замаскированы
        if (!hasMask) {
          controller.error(new Error('WebSocket protocol error: unmasked client frame'))
          return
        }

        let headerLength = 2 // Базовая длина заголовка

        // Вычисляем расширенную длину фрейма
        if (payloadLen === 126) {
          if (buffer.byteLength < 4) return // Ждем догрузки байт длины
          payloadLen = view.getUint16(2)
          headerLength += 2
        } else if (payloadLen === 127) {
          if (buffer.byteLength < 10) return // Ждем догрузки байт длины
          // В JS getUint64 нет, читаем как два 32-битных слова (с ограничением точности до 53 бит)
          const high = view.getUint32(2)
          const low = view.getUint32(6)
          payloadLen = high * 0x100000000 + low
          headerLength += 8
        }

        // Добавляем 4 байта маски к длине заголовка
        const maskOffset = headerLength
        headerLength += 4

        // Проверяем, прилетел ли фрейм ЦЕЛИКОМ (заголовок + все данные)
        const totalFrameLength = headerLength + payloadLen
        if (buffer.byteLength < totalFrameLength) {
          // Данные фрейма еще не долетели по TCP, выходим из цикла и ждем следующий chunk
          return
        }

        // Извлекаем маску (4 байта)
        const mask = buffer.slice(maskOffset, maskOffset + 4)

        // Извлекаем и демаскируем Payload (XOR)
        const rawPayload = buffer.subarray(headerLength, totalFrameLength)
        const payload = new Uint8Array(payloadLen)
        for (let i = 0; i < payloadLen; i++) {
          payload[i] = rawPayload[i]! ^ mask[i % 4]!
        }

        // Отрезаем обработанный фрейм из буфера аккумулятора
        buffer = buffer.slice(totalFrameLength)

        // --- ОБРАБОТКА ТИПОВ ФРЕЙМОВ (OPCODES) ---

        // 1. Управляющие фреймы (не фрагментируются)
        if (opcode === OPCODES.CLOSE) {
          controller.terminate()
          return
        }
        if (opcode === OPCODES.PING) {
          // Здесь в реальном сервере нужно отправить PONG клиенту обратно в writable
          continue
        }
        if (opcode === OPCODES.PONG) {
          continue
        }

        // 2. Фреймы данных (Текст / Бинарные / Продолжение)
        if (opcode === OPCODES.TEXT || opcode === OPCODES.BINARY) {
          if (messagePayloads.length > 0) {
            controller.error(new Error('WebSocket protocol error: expected continuation frame'))
            return
          }
          messageOpcode = opcode
        } else if (opcode === OPCODES.CONTINUATION) {
          if (messageOpcode === null) {
            controller.error(new Error('WebSocket protocol error: unexpected continuation frame'))
            return
          }
        } else {
          controller.error(new Error(`WebSocket protocol error: unknown opcode ${opcode}`))
          return
        }

        // Сохраняем кусок сообщения
        messagePayloads.push(payload)
        totalMessageLength += payloadLen

        if (totalMessageLength > MAX_MESSAGE_SIZE) {
          controller.error(new Error('WebSocket message too big (DoS protection)'))
          return
        }

        // Если это финальный фрейм (FIN = 1), собираем сообщение целиком и пушим наружу
        if (fin) {
          // Склеиваем все накопленные фрагменты в один массив
          let finalPayload = new Uint8Array(totalMessageLength)
          let offset = 0
          for (const p of messagePayloads) {
            finalPayload.set(p, offset)
            offset += p.byteLength
          }

          // Эмитим результат в зависимости от стартового opcode сообщения
          if (messageOpcode === OPCODES.TEXT) {
            const textDecoder = new TextDecoder('utf-8')
            controller.enqueue({
              type: 'text',
              data: textDecoder.decode(finalPayload),
            })
          } else if (messageOpcode === OPCODES.BINARY) {
            controller.enqueue({
              type: 'arraybuffer',
              data: finalPayload,
            })
          }

          // Сбрасываем состояние сборщика для следующего сообщения
          messageOpcode = null
          messagePayloads = []
          totalMessageLength = 0
        }
      }
    },

    flush(controller) {
      // Подчищаем ссылки при закрытии стрима
      buffer = new Uint8Array(0)
      messagePayloads = []
    },
  })
}

export const websocketWriter = (options?: {fragmentSize?: number}) => {
  const FRAGMENT_SIZE = options?.fragmentSize ?? DEFAULT_FRAGMENT_SIZE

  /**
   * Вспомогательная функция сборки ОДНОГО фрейма
   */
  const buildFrame = (fin: boolean, opcode: number, payload: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> => {
    const len = payload.byteLength
    let headerLength = 2 // Базовый размер: 1B (FIN+Opcode) + 1B (Mask+Len)

    // Определяем размер поля длины
    if (len >= 126 && len <= 65535) {
      headerLength += 2
    } else if (len > 65535) {
      headerLength += 8
    }

    const frame = new Uint8Array(headerLength + len)
    const view = new DataView(frame.buffer)

    // 1. Устанавливаем первый байт (FIN бит + Opcode)
    let firstByte = opcode & 0x0F
    if (fin) firstByte |= 0x80
    view.setUint8(0, firstByte)

    // 2. Устанавливаем второй байт и расширенную длину (Маска для сервера ВСЕГДА 0)
    if (len < 126) {
      view.setUint8(1, len) // Маска 0, длина в 7 бит
    } else if (len <= 65535) {
      view.setUint8(1, 126)
      view.setUint16(2, len)
    } else {
      view.setUint8(1, 127)
      // Записываем 64-битную длину (JS BigInt)
      view.setBigUint64(2, BigInt(len))
    }

    // 3. Копируем полезную нагрузку (Payload) сразу после заголовка
    frame.set(payload, headerLength)
    return frame
  }

  return new TransformStream<WebSocketPairWritable, Uint8Array<ArrayBuffer>>({
    start() {},

    async transform(message, controller) {
      // --- Обработка управляющих фреймов (Ping/Pong/Close) ---
      if (message.type === 'ping') {
        controller.enqueue(buildFrame(true, OPCODES.PING, message.data ?? new Uint8Array(0)))
        return
      }
      if (message.type === 'pong') {
        controller.enqueue(buildFrame(true, OPCODES.PONG, message.data ?? new Uint8Array(0)))
        return
      }
      if (message.type === 'close') {
        let payload = new Uint8Array(0)
        if (message.code) {
          const reasonBytes = message.reason ? encoder.encode(message.reason) : new Uint8Array(0)
          payload = new Uint8Array(2 + reasonBytes.byteLength)
          const view = new DataView(payload.buffer)
          view.setUint16(0, message.code)
          payload.set(reasonBytes, 2)
        }
        controller.enqueue(buildFrame(true, OPCODES.CLOSE, payload))
        controller.terminate()
        return
      }

      // --- Обработка фреймов данных (Text/Binary) ---
      // Конвертируем входные данные строго в Uint8Array
      const rawData = message.type === 'text' ? encoder.encode(message.data) : message.data
      const initialOpcode = message.type === 'text' ? OPCODES.TEXT : OPCODES.BINARY

      const totalLength = rawData.byteLength

      // Если сообщение маленькое, отправляем его одним фреймом (FIN = true)
      if (totalLength <= FRAGMENT_SIZE) {
        controller.enqueue(buildFrame(true, initialOpcode, rawData))
        return
      }

      // --- ЛОГИКА СЕГМЕНТАЦИИ (ФРАГМЕНТАЦИИ) НА КУСКИ ---
      let offset = 0
      let isFirstFrame = true

      while (offset < totalLength) {
        const remaining = totalLength - offset
        const currentSize = Math.min(FRAGMENT_SIZE, remaining)
        const isLastFrame = remaining <= FRAGMENT_SIZE

        // Вырезаем кусок данных для текущего фрейма
        const chunk = rawData.subarray(offset, offset + currentSize)

        // Определяем Opcode для текущего кадра
        // Первый кадр задает тип (TEXT/BINARY), все последующие идут как CONTINUATION (0x0)
        const currentOpcode = isFirstFrame ? initialOpcode : OPCODES.CONTINUATION

        // Формируем фрейм. FIN равен true только у самого последнего фрагмента
        const frame = buildFrame(isLastFrame, currentOpcode, chunk)
        controller.enqueue(frame)

        offset += currentSize
        isFirstFrame = false
      }
    },

    flush() {},
  })
}

// #endregion

/*
const websocketToFrame = () => {
  let buffer = new Uint8Array(0)

  return new TransformStream<Uint8Array<ArrayBuffer>, Uint8Array<ArrayBuffer>>({
    transform(chunk, controller) {
      buffer = new Uint8Array([...buffer, ...chunk])

      while (buffer.length > 0) {
        try {
          const frame = readFrame(buffer)
          if (buffer.length >= frame.length) {
            unmask(frame.data, frame.mask!)
            controller.enqueue(frame)
            buffer = buffer.subarray(frame.frameLength) // next frame
          } else {
            break // collect full frame
          }
        } catch (error) {
          controller.error(error)
          break
        }
      }
    },
    flush(controller) {},
  })
}

// frame -> result
const transformFrameToResult = () => {
  let continuationData = new Uint8Array()
  let continuationOpcode: typeof OpCode[keyof typeof OpCode] | null = null

  return new TransformStream<Frame, string | Uint8Array>({
    transform(frame, controller) {
      if (frame.opcode === OpCode.ContinuationFrame) {
        if (continuationOpcode === null) {
          throw new Error('Received continuation frame without initial frame')
        }
        continuationData = new Uint8Array([...continuationData, ...frame.data])
        if (frame.fin) {
          if (continuationOpcode === OpCode.Text) {
            controller.enqueue(decoder.decode(frame.data))
          } else if (continuationOpcode === OpCode.Binary) {
            controller.enqueue(frame.data)
          }
          continuationData = new Uint8Array()
          continuationOpcode = 0
        }
      } else {
        if (continuationOpcode !== null) {
          throw new Error('Received new frame before finishing continuation frames')
        }

        if (frame.opcode === OpCode.Text || frame.opcode === OpCode.Binary) {
          continuationOpcode = frame.opcode
          continuationData = frame.data
          if (frame.fin) {
            if (frame.opcode === OpCode.Text) {
              controller.enqueue(new TextDecoder().decode(continuationData))
            } else if (frame.opcode === OpCode.Binary) {
              controller.enqueue(continuationData)
            }
            continuationData = new Uint8Array(0)
            continuationOpcode = null
          }
        } else if (frame.opcode === OpCode.Close) {
          controller.terminate()
        }
      }
    },
  })
}

export const readFrame = (buf: Uint8Array<ArrayBuffer>): Frame => {
  // https://datatracker.ietf.org/doc/html/rfc6455#section-5.2
  const fin = (buf[0]! & 0b1000_0000) !== 0
  // const rsv1 = (buf[0] & 0b0100_0000) !== 0
  // const rsv2 = (buf[0] & 0b0010_0000) !== 0
  // const rsv3 = (buf[0] & 0b0001_0000) !== 0
  const opcode: typeof OpCode[keyof typeof OpCode] = buf[0] & 0b0000_1111
  const masked = (buf[1] & 0b1000_0000) !== 0
  let payloadLength = buf[1] & 0b0111_1111

  let payloadOffset = 2
  if (payloadLength === 126) {
    const view = new DataView(buf.buffer, buf.byteOffset + 2)
    payloadLength = view.getUint16(0)
    payloadOffset = 4
  } else if (payloadLength === 127) {
    const view = new DataView(buf.buffer, buf.byteOffset + 2)
    const len = view.getBigUint64(0)
    if (len > MAX_MESSAGE_SIZE) {
      throw new Error(`MAX MESSAGE SIZE: current ${len}, expect ${MAX_MESSAGE_SIZE}`)
    }
    payloadOffset = 10
    payloadLength = Number(len)
  }

  const frameLength = payloadOffset + (masked ? 4 : 0) + payloadLength
  const mask = masked ? buf.subarray(payloadOffset, payloadOffset + 4) : null
  const data = buf.subarray(
    payloadOffset + (masked ? 4 : 0),
    payloadOffset + (masked ? 4 : 0) + payloadLength,
  )

  return {
    fin,
    opcode,
    length: payloadLength,
    frameLength,
    mask,
    data,
  }
}
 */
