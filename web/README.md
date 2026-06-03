# Enhanced web api

## Fetch with middleware

```ts
import {Fetch} from '@maks11060/web/fetch'

const api = Fetch({baseUrl: 'https://localhost/'})
  .use({
    onRequest({request, options}) {
      // Add authorization header
      request.headers.set('Authorization', 'Bearer token')
    },
    onResponse({response}) {
      // Log response status
      console.log(`Response: ${response.status}`)
    },
  })

const response = await api.fetch('/')
console.log(await response.json())
```

## BroadcastChannel with types

```ts
import {BroadcastChannelTyped} from '@maks11060/web/broadcast-channel'

type BcType =
  | {type: 'req'}
  | {type: 'res'; value: number}

const bc = new BroadcastChannelTyped<BcType>('bc-test')

bc.addEventListener('message', (e) => {
  console.log(e.data)
  if (e.data.type === 'req') bc.postMessage({type: 'res', value: Date.now()})
})
```

## URLPattern with typed exec (WIP)

```ts
import {URLPatternTyped} from '@maks11060/web/url-pattern'

const p = new URLPatternTyped({
  pathname: '/users/:userId{/posts/:postId}?',
})
const res = p.exec({pathname: '/users/123'})!
console.log(
  res.pathname.groups satisfies {userId: string; postId?: string},
)
```
