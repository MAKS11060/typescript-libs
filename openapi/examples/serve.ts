import {OpenAPI} from '@maks11060/openapi'
import {Hono} from 'hono'
import {cors} from 'hono/cors'
import '../../lib/dev/yaml.ts'

export const serve = (doc: OpenAPI) => {
  const app = new Hono() //
    .use(cors())
    .get('/openapi.json', (c) => c.text(doc.toJSON(true), {headers: {'Content-Type': 'application/json'}}))
    .get('/openapi.yml', (c) => c.text(doc.toYAML()))

  // Deno.serve(app.fetch)
  Deno.serve({
    onListen({hostname, port}) {
      const host = hostname === '0.0.0.0' ? 'localhost' : hostname
      const uri = new URL('/openapi.yml', `http://localhost`)
      uri.port = `${port}`
      uri.hostname = `${host}`

      const swaggerUri = new URL(`https://swagger-next.deno.dev/?url=${uri.toString()}`)
      console.log(swaggerUri.toString())
      // console.log('https://swagger-next.deno.dev/?url=http://localhost:8000/openapi.yml')
    },
  }, app.fetch)
}
