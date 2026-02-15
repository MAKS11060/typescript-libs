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

  // const res = await api.fetch('https://api.myip.com/')
  // await res.body?.cancel()
})

Deno.test('Test 334341', async (t) => {
  const api = Fetch({baseUrl: 'https://api.myip.com/'})
    .use({
      onResponse({response}) {
        // Log response status
        console.log(`Response: ${response.status}`)
      },
    })

  // const response = await api.fetch('/')
  // console.log(await response.json())
})

Deno.test('Test 477518', async (t) => {
  const api = Fetch()
  api.use(await fetchCache({name: 'cache-1', ttl: 10, log: true}))

  // const res = await api.fetch('https://api.myip.com/')
  // console.log(await res.json())
})
