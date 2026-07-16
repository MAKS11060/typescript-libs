#!/usr/bin/env -S deno run -A --env-file --watch-hmr

import {serve} from '#server'
import {connect} from 'net'
import {Readable, Writable} from 'node:stream'
import {bidirectionalPipe, bidirectionalSocket, copy, copyStream} from '../src/lib/io.ts'

serve({
  async connect(request) {
    // console.log(request)
    switch (request.connectProtocol) {
      case 'socks4': {
        const socks4 = request.upgradeSocks4()
        const clientRequest = socks4.clientRequest()
        console.log(clientRequest)

        try {
          // const targetConn = await Deno.connect(clientRequest)
          // connect(clientRequest)
          const conn = connect({
            host: clientRequest.hostname,
            port: clientRequest.port,
          })
          const targetConn = {
            writable: Writable.toWeb(conn),
            readable: Readable.toWeb(conn),
          }

          const clientConn = await socks4.accept()

          await bidirectionalPipe(targetConn, clientConn)
          // await bidirectionalSocket(targetConn, clientConn)
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
            const conn = connect({
              host: clientRequest.hostname,
              port: clientRequest.port,
            })
            const targetConn = {
              writable: Writable.toWeb(conn),
              readable: Readable.toWeb(conn),
            }

            const clientConn = await socks5.accept()

            await bidirectionalPipe(targetConn, clientConn)
            // await bidirectionalSocket(targetConn, clientConn)
          }
        } catch (e) {
          console.error(e)
          await socks5.reject('HostUnreachable')
        }

        return
      }
    }
  },
}, {port: 1081})
