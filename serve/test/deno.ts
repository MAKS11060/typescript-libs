#!/usr/bin/env -S deno run -A --env-file --watch-hmr

import {serve} from '#serve'
import {bidirectionalSocket} from '../src/lib/io.ts'

serve({
  async connect(request) {
    // console.log(request)
    switch (request.connectProtocol) {
      case 'socks4': {
        const socks4 = request.upgradeSocks4()
        const clientRequest = socks4.clientRequest()

        try {
          const targetConn = await Deno.connect(clientRequest)
          const clientConn = await socks4.accept()

          await bidirectionalSocket(targetConn, clientConn)
        } catch (e) {
          console.error(e)
          await socks4.reject()
        }

        return
      }

      case 'socks5': {
        const socks5 = request.upgradeSocks5() // accept socks5 connect
        // console.log(socks5)

        // await socks5.rejectAuthorization() // ok

        // no auth
        // await socks5.clientAuthorization('NoAuth') // ok

        // auth password
        // const cred = await socks5.clientAuthorization('Password')
        // if (cred.username === 'user' && cred.password === 'pass') {
        //   await socks5.acceptAuthorization()
        //   console.log('auth success', cred)
        // } else {
        //   await socks5.rejectAuthorization()
        //   console.log('auth failed', cred)
        // }

        const clientRequest = await socks5.clientRequest()
        console.log(clientRequest)

        try {
          if (clientRequest.command === 'connect') {
            const targetConn = await Deno.connect(clientRequest)
            const clientConn = await socks5.accept()

            await bidirectionalSocket(targetConn, clientConn)
          }
        } catch (e) {
          console.error(e)
          await socks5.reject('HostUnreachable')
        }

        return
      }

      case 'websocket': {
        const ws = request.upgradeWebSocketStream()
        const {readable, writable} = await ws.opened

        const writer = writable.getWriter()

        for await (const {type, data} of readable) {
          writer.write({type, data})

          if (type === 'arraybuffer') {
            console.log(new TextDecoder().decode(data))
          } else {
            console.log(data)
          }
        }
      }
    }
  },
}, {port: 1081})
