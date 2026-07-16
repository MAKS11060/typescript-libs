const VER = 0x05
const RSV = 0x00

export const AUTH = {
  NoAuth: 0x00,
  Password: 0x02,
} as const

const ADDR_TYPE = {
  IPv4: 0x01,
  IPv6: 0x04,
  Domain: 0x03,
} as const

const CLIENT_CMD = {
  /** TCP connect  */
  Connect: 0x01,
  Bind: 0x02,
  UDPAssociate: 0x03,
} as const

const SERVER_REPLIES = {
  Succeeded: 0x00,
  GeneralFailure: 0x01,
  ConnectionNotAllowedByRuleset: 0x02,
  NetworkUnreachable: 0x03,
  HostUnreachable: 0x04,
  ConnectionRefused: 0x05,
  TTLExpired: 0x06,
  CommandNotSupported: 0x07,
  AddressTypeNotSupport: 0x08,
} as const

const ConnectionState = {
  Open: 0,
  Close: 1,
  ClientHello: 2,
  ClientAuth: 3,
  ClientRequest: 4,
} as const

// #region helper
const acceptAuthMethod = (authType: typeof AUTH[keyof typeof AUTH] | number = 0xff) => {
  return new Uint8Array([VER, authType])
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const parseAuthPassword = (buf: Uint8Array) => {
  const username = new Uint8Array(
    buf.buffer,
    2, // VER + IDLEN
    buf.at(1), // IDLEN
  )
  const password = new Uint8Array(
    buf.buffer,
    username.byteLength + 2 + 1, // VER + IDLEN + PWLEN
    buf.at(username.byteLength + 2), // PWLEN
  )
  return {
    username: decoder.decode(username),
    password: decoder.decode(password),
  }
}

const parseSocks5Addr = (c: Uint8Array, offset = 3) => {
  const view = new DataView(c.buffer, c.byteOffset + offset)
  const type = view.getUint8(0) as typeof ADDR_TYPE[keyof typeof ADDR_TYPE]

  if (type === ADDR_TYPE.IPv4) {
    return {
      type: 'IPv4',
      transport: 'tcp',
      hostname: `${view.getUint8(1)}.${view.getUint8(2)}.${view.getUint8(3)}.${view.getUint8(4)}`,
      port: view.getUint16(5),
    } as const
  } else if (type === ADDR_TYPE.IPv6) {
    const ipv6Array = new Uint8Array(c.buffer, view.byteOffset + 1, 16)
    return {
      type: 'IPv6',
      transport: 'tcp',
      hostname: uint8ArrayToIpv6(ipv6Array),
      port: view.getUint16(17),
    } as const
  } else if (type === ADDR_TYPE.Domain) {
    const len = view.getUint8(1)
    return {
      type: 'Domain',
      transport: 'tcp',
      hostname: decoder.decode(c.subarray(view.byteOffset + 2, view.byteOffset + 2 + len)),
      port: view.getUint16(2 + len),
    } as const
  }

  throw new Error('Invalid or unsupported ADDR type')
}

const ipv6ToUint8Array = (ipv6: string): Uint8Array => {
  const segments = ipv6.split(':')

  if (segments.length !== 8) {
    throw new Error('Invalid IPv6 address')
  }

  const result = new Uint8Array(16)

  for (let i = 0; i < 8; i++) {
    const segment = parseInt(segments[i]!, 16)
    if (isNaN(segment) || segment < 0 || segment > 0xffff) {
      throw new Error('Invalid IPv6 segment')
    }
    result[2 * i] = (segment >> 8) & 0xff
    result[2 * i + 1] = segment & 0xff
  }

  return result
}

const uint8ArrayToIpv6 = (uint8Array: Uint8Array, compact: boolean = false): string => {
  if (uint8Array.length !== 16) {
    throw new Error('Invalid Uint8Array length')
  }

  const segments: string[] = []

  for (let i = 0; i < 8; i++) {
    const highByte = uint8Array[2 * i]!
    const lowByte = uint8Array[2 * i + 1]!
    const segment = (highByte << 8) | lowByte
    segments.push(segment.toString(16).toUpperCase().padStart(4, '0'))
  }

  if (compact) {
    let compressed = false
    for (let i = 0; i < segments.length; i++) {
      if (segments[i] === '0000') {
        if (!compressed) {
          segments[i] = ''
          compressed = true
        } else {
          segments[i] = '0'
        }
      }
    }
  }

  // return segments.join(':').replace(/(^|:)(:|$)/g, '::')
  return segments.join(':').replace(/((^|:)(0(:|$)){2,})/g, '::')
}

// #endregion

interface SOCKS5ClientAuthorization {
  NoAuth: void
  Password: ReturnType<typeof parseAuthPassword>
}

type SOCKS5RequestResult = {
  command: 'connect' | 'bind' | 'udp-associate'

  type: 'IPv4' | 'IPv6' | 'Domain'
  transport: 'tcp'
  hostname: string
  port: number
}

export class SOCKS5 {
  readonly #conn: Deno.Conn
  readonly #reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>
  readonly #writer: WritableStreamDefaultWriter<Uint8Array<ArrayBuffer>>

  readonly clientSupportedAuth: Set<number>
  #state: typeof ConnectionState[keyof typeof ConnectionState] = ConnectionState.ClientHello
  #activeAuthMethod: number | null = null
  #clientRequest: SOCKS5RequestResult | null = null

  constructor(options: {
    conn: Deno.Conn
    clientSupportedAuth: Set<number>
  }) {
    this.#conn = options.conn
    this.clientSupportedAuth = options.clientSupportedAuth

    this.#reader = this.#conn.readable.getReader()
    this.#writer = this.#conn.writable.getWriter()
  }

  get state() {
    return this.#state
  }

  #close(isError?: boolean) {
    this.#state = ConnectionState.Close
    this.#reader.releaseLock()
    this.#writer.releaseLock()
    if (isError) {
      this.#conn.close()
    }
  }

  // #region auth
  async clientAuthorization<T extends keyof SOCKS5ClientAuthorization>(
    method: T,
  ): Promise<SOCKS5ClientAuthorization[T]> {
    if (this.#state !== ConnectionState.ClientHello) throw new Error('') // TODO

    this.#activeAuthMethod = AUTH[method]

    if (!this.clientSupportedAuth.has(AUTH[method])) { // Client not supported this auth method
      await this.rejectAuthorization()
      throw new Error(`Client does not support requested auth method: ${method}`)
    }

    this.#state = ConnectionState.ClientAuth

    switch (AUTH[method]) {
      case AUTH.NoAuth:
        await this.#writer.write(acceptAuthMethod(AUTH.NoAuth))
        this.#state = ConnectionState.ClientRequest
        return void 0 as SOCKS5ClientAuthorization[T]

      case AUTH.Password:
        await this.#writer.write(acceptAuthMethod(AUTH.Password))

        const {done, value} = await this.#reader.read()
        if (done) throw new Error('Auth data not provided by client')

        return parseAuthPassword(value) as SOCKS5ClientAuthorization[T]

      default:
        // await this.rejectAuthorization()
    }

    throw new Error('Unsupported sub-auth method architecture')
  }

  async acceptAuthorization() {
    if (this.state !== ConnectionState.ClientAuth) {
      throw new Error('Cannot accept authorization: Wrong state')
    }

    // await this.#writer.write(authGranted())
    await this.#writer.write(new Uint8Array([0x01, 0x00]))
    this.#state = ConnectionState.ClientRequest
  }

  async rejectAuthorization() {
    switch (this.#state) {
      case ConnectionState.ClientHello: // throw before read auth
        await this.#writer.write(new Uint8Array([VER, 0xFF])) // No authentication method was acceptable.
        break

      case ConnectionState.ClientAuth:
        if (this.#activeAuthMethod === AUTH.Password) {
          await this.#writer.write(new Uint8Array([0x01, 0x01]))
        } else {
          await this.#writer.write(new Uint8Array([VER, 0xFF]))
        }
        break

      default:
        await this.#writer.write(new Uint8Array([VER, 0xFF]))
        break
    }

    this.#close(true)
  }
  // #endregion

  async clientRequest() {
    if (this.#state === ConnectionState.ClientHello) { // ClientHello => skip auth => ClientRequest
      await this.clientAuthorization('NoAuth')
    }

    if (this.#state !== ConnectionState.ClientRequest) {
      throw new Error(`Invalid state: ${this.#state}`)
    }

    const {done, value: c} = await this.#reader.read()
    if (done) throw new Error('Reader is empty')

    const view = new DataView(c.buffer)

    // VER
    if (view.getUint8(0) !== VER) {
      await this.reject('GeneralFailure')
      throw new Error('SOCKS5 Upgrade failed: Wrong version')
    }
    // CMD
    const command = view.getUint8(1) as typeof CLIENT_CMD[keyof typeof CLIENT_CMD]
    if (![1, 2, 3].includes(command)) {
      await this.reject('CommandNotSupported')
      throw new Error('SOCKS5 Upgrade failed: Unsupported command')
    }
    // RSV
    if (view.getUint8(2) !== RSV) {
      await this.reject('GeneralFailure')
      throw new Error('SOCKS5 Upgrade failed: RSV non-zero')
    }

    // DST.ADDR + DST.PORT
    const addr = parseSocks5Addr(c)
    if (!addr) {
      await this.reject('CommandNotSupported')
      throw new Error('SOCKS5 Parse addr error')
    }

    this.#clientRequest = {
      command: ({
        1: 'connect',
        2: 'bind',
        3: 'udp-associate',
      } as const)[command],
      ...addr,
    }

    return this.#clientRequest
  }

  async #accept(options: {
    status?: keyof typeof SERVER_REPLIES
    type?: keyof typeof ADDR_TYPE
    /**
     * - '0.0.0.0'
     * - 'google.com'
     */
    hostname?: string
    port?: number
  }) {
    options.status ??= options?.status ?? 'GeneralFailure'

    options.type ??= this.#clientRequest?.type ?? 'IPv4'
    options.hostname ??= this.#clientRequest?.hostname ?? '0.0.0.0'
    options.port ??= this.#clientRequest?.port ?? 0

    const bndPort = [(options.port >> 8) & 0xff, options.port & 0xff]

    if (options.type === 'IPv4') {
      await this.#writer.write(
        new Uint8Array([
          VER,
          SERVER_REPLIES[options.status],
          RSV,
          ADDR_TYPE.IPv4,
          ...(options.hostname.split('.').map((octet) => parseInt(octet))),
          ...bndPort,
        ]),
      )
    } else if (options.type === 'IPv6') {
      await this.#writer.write(
        new Uint8Array([
          VER,
          SERVER_REPLIES[options.status],
          RSV,
          ADDR_TYPE.IPv6,
          ...ipv6ToUint8Array(options.hostname),
          ...bndPort,
        ]),
      )
    } else if (options.type === 'Domain') {
      const domain = encoder.encode(options.hostname)
      await this.#writer.write(
        new Uint8Array([
          VER,
          SERVER_REPLIES[options.status],
          RSV,
          ADDR_TYPE.Domain,
          domain.byteLength,
          ...domain,
          ...bndPort,
        ]),
      )
    }
  }

  async accept(options?: {
    type?: keyof typeof ADDR_TYPE
    /**
     * - '0.0.0.0'
     * - 'google.com'
     */
    hostname?: string
    port?: number
  }) {
    if (this.#state !== ConnectionState.ClientRequest) throw new Error('')
    this.#state = ConnectionState.Open

    await this.#accept({
      status: 'Succeeded',
      ...this.#clientRequest,
      ...options,
    })

    this.#reader.releaseLock()
    this.#writer.releaseLock()

    return this.#conn
  }

  async reject(reason?: keyof Omit<typeof SERVER_REPLIES, 'Succeeded'>, options?: {
    type?: keyof typeof ADDR_TYPE
    /**
     * - '0.0.0.0'
     * - 'google.com'
     */
    hostname?: string
    port?: number
  }) {
    await this.#accept({
      status: reason ?? 'GeneralFailure',
      ...this.#clientRequest,
      ...options,
    })

    this.#close(true)
  }
}
