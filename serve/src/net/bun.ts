#!/usr/bin/env -S bun --hot

// TODO WIP

import {ServeHandler, ServeOptions} from '../lib/types.ts'

export const serve = async (handler: ServeHandler, options: ServeOptions) => {
  const connections = new WeakMap<WeakKey, any>()

  const listener = Bun.listen({
    port: options.port,
    hostname: options.hostname ?? '0.0.0.0',

    socket: {
      binaryType: 'uint8array',

      data(socket, data) {
        connections
      },

      close(socket, error) {
        console.log(error)
      },
    },
  })

  options.signal?.addEventListener('abort', () => listener.stop(true))
}
