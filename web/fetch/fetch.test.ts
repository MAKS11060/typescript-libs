import {fetchCache} from './cache.ts'
import {Fetch} from './fetch.ts'

Deno.test('Test 800287', async (t) => {
  const api = Fetch()
    .use({
      onRequest({request}) {
        console.log('req 1')
      },
      onResponse({request, response}) {
        console.log('res 1')
      },
    })
    .use({
      onRequest({request}) {
        console.log('req 2')
      },
      onResponse({request, response}) {
        console.log('res 2')
      },
    })

  const res = await api.fetch('https://prev.maks11060-mdb.deno.net/')
  await res.body?.cancel()
})

Deno.test('Test 334341', async (t) => {
  const api = Fetch({baseUrl: 'https://api.myip.com/'})
    .use({
      onRequest({request, options}) {
        // Add authorization header
        const headers = new Headers(request.headers)
        headers.set('Authorization', 'Bearer token')
        return new Request(request, {headers})
      },
      onResponse({response}) {
        // Log response status
        console.log(`Response: ${response.status}`)
      },
    })

  const response = await api.fetch('/')
  console.log(await response.json())
})

Deno.test('Test 477518', async (t) => {
  const test1 = Fetch()
  test1.use(await fetchCache({name: 'cache-1'}))
})
