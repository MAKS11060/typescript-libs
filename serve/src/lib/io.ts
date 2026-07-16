// #region Deno streams
interface Reader {
  read(p: Uint8Array): Promise<number | null>
}
interface Writer {
  write(p: Uint8Array): Promise<number>
}

interface Socket extends Reader, Writer {}

const writeAll = async (writer: Writer, data: Uint8Array) => {
  let nwritten = 0
  while (nwritten < data.length) {
    nwritten += await writer.write(data.subarray(nwritten))
  }
}

export const copy = async (src: Reader, dst: Writer, options?: {bufSize?: number}): Promise<number> => {
  const buf = new Uint8Array(options?.bufSize ?? 32 * 1024)
  let n = 0
  while (true) {
    const result = await src.read(buf)
    if (result === null) break

    await writeAll(dst, buf.subarray(0, result))
    n += result
  }
  return n
}

export const bidirectionalSocket = async (socket1: Socket, socket2: Socket) => {
  return await Promise.all([
    copy(socket1, socket2),
    copy(socket2, socket1),
  ])
}
// #endregion

// #region WebStreams
export const copyStream = async (readable: ReadableStream<Uint8Array>, writable: WritableStream<Uint8Array>) => {
  const writer = writable.getWriter()
  try {
    for await (const chunk of readable) {
      await writer.write(chunk)
    }
  } catch (err) {
    console.error('Stream copy error:', err)
  } finally {
    try {
      await writer.close()
    } catch (_) {}
  }
}

export const bidirectionalPipe = async (pipe1: TransformStream, pipe2: TransformStream) => {
  await Promise.all([
    copyStream(pipe1.readable, pipe2.writable),
    copyStream(pipe2.readable, pipe1.writable),
  ])
}
// #endregion
