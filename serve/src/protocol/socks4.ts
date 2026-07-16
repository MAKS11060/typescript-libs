const SOCKS4_CODE = {
  success: 0x5a,
  rejected: 0x5b, // Запрос отклонен или ошибочен
  identdFailed: 0x5c, // Не удалось связаться с identd на клиенте
  identdMismatched: 0x5d, // Идентификатор пользователя не совпадает
} as const

type SOCKS4State = 'uninitialized' | 'established' | 'rejected'

export class SOCKS4 {
  readonly #conn: Deno.Conn
  readonly #chunk: Uint8Array<ArrayBuffer>

  readonly #reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>
  readonly #writer: WritableStreamDefaultWriter<Uint8Array<ArrayBuffer>>

  #state: SOCKS4State = 'uninitialized'

  constructor(options: {
    conn: Deno.Conn
    chunk: Uint8Array<ArrayBuffer> // first fragment
  }) {
    this.#conn = options.conn
    this.#chunk = options.chunk

    this.#reader = this.#conn.readable.getReader()
    this.#writer = this.#conn.writable.getWriter()
  }

  get state(): SOCKS4State {
    return this.#state
  }

  clientRequest() {
    const view = new DataView(this.#chunk.buffer)

    const command = view.getUint8(1) as 1 | 2
    if (command !== 1 && command !== 2) throw new Error('SOCKS4 Command most be 1 or 2')

    const id = view.getUint8(8)

    return {
      command: ({
        1: 'connect',
        2: 'bind',
      } as const)[command],
      type: 'IPv4',
      transport: 'tcp',
      hostname: `${view.getUint8(4)}.${view.getUint8(5)}.${view.getUint8(6)}.${view.getUint8(7)}`,
      port: view.getUint16(2),
      id,
    } as const
  }

  async accept(options?: {
    /**
     * IPv4 Address
     * @example 127.0.0.1
     */
    distAddr?: string
    /**
     * @example 443
     */
    distPort?: number
  }) {
    const response = new Uint8Array(8)
    response[0] = 0x00
    response[1] = 0x5A // success

    if (options?.distPort) {
      new DataView(response.buffer).setUint16(2, options.distPort)
    }
    if (options?.distAddr) {
      response.set(options?.distAddr.split('.', 4).map(Number), 4)
    }

    await this.#writer.write(response)

    this.#reader.releaseLock()
    this.#writer.releaseLock()

    this.#state = 'established'

    return this.#conn
  }

  async reject(reason: 'rejected' | 'identdFailed' | 'identdMismatched' = 'rejected') {
    if (this.#state !== 'uninitialized') {
      throw new Error(`Cannot reject: session is already in '${this.#state}' state`)
    }

    const response = new Uint8Array(8)
    response[0] = 0x00
    response[1] = SOCKS4_CODE[reason]

    try {
      await this.#writer.write(response)
    } finally {
      this.#reader.releaseLock()
      this.#writer.releaseLock()
      this.#conn.close()

      this.#state = 'rejected'
    }
  }
}
