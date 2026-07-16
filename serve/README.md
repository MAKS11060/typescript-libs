# Serve

## SOCKS5 - SOCKS4

```ts
import {serve} from '@maks11060/serve'
import {bidirectionalSocket} from '@maks11060/serve/io'

const requireAuthorization = false

serve({
  async connect(request) {
    switch (request.connectProtocol) {
      case 'socks5': {
        const socks5 = request.upgradeSocks5() // accept socks5 connect

        if (requireAuthorization) {
          const cred = await socks5.clientAuthorization('Password') // request password
          if (cred.username === 'user' && cred.password === 'pass') {
            await socks5.acceptAuthorization()
            console.log(
              `auth success: ${request.remoteAddress.hostname}:${request.remoteAddress.port} ${cred.username}`,
            )
          } else {
            await socks5.rejectAuthorization()
            console.log('auth failed', cred)
          }
        }

        // ClientRequest
        const clientRequest = await socks5.clientRequest()
        console.log(clientRequest)

        try {
          if (clientRequest.command === 'connect') {
            const targetConn = await Deno.connect(clientRequest)

            // Accept connection
            const clientConn = await socks5.accept()

            await bidirectionalSocket(targetConn, clientConn)
          }
        } catch (e) {
          console.error(e)
          await socks5.reject('HostUnreachable')
        }

        return
      }

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
    }
  },
}, {port: 1080})
```
