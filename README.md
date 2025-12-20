# Typescript libs

[![JSR Score](https://jsr.io/badges/@maks11060)](https://jsr.io/@maks11060)
[![CI](https://github.com/MAKS11060/typescript-libs/actions/workflows/ci.yml/badge.svg)](https://github.com/MAKS11060/typescript-libs/actions/workflows/ci.yml)

| Packages                                   |             [JSR](https://jsr.io/@maks11060)             |
| ------------------------------------------ | :------------------------------------------------------: |
| [@maks11060/kv][@maks11060/kv]             |       [![JSR][@maks11060/kv badge]][@maks11060/kv]       |
| [@maks11060/web][@maks11060/web]           |      [![JSR][@maks11060/web badge]][@maks11060/web]      |
| [@maks11060/oauth2][@maks11060/oauth2]     |   [![JSR][@maks11060/oauth2 badge]][@maks11060/oauth2]   |
| [@maks11060/openapi][@maks11060/openapi]   |  [![JSR][@maks11060/openapi badge]][@maks11060/openapi]  |
| [@maks11060/webauthn][@maks11060/webauthn] | [![JSR][@maks11060/webauthn badge]][@maks11060/webauthn] |

| Packages                               |           [JSR](https://jsr.io/@maks11060)           | Repo                                          |
| -------------------------------------- | :--------------------------------------------------: | --------------------------------------------- |
| [@maks11060/crypto][@maks11060/crypto] | [![JSR][@maks11060/crypto badge]][@maks11060/crypto] | [github](https://github.com/MAKS11060/crypto) |
| [@maks11060/bits][@maks11060/bits]     |   [![JSR][@maks11060/bits badge]][@maks11060/bits]   | [github](https://github.com/MAKS11060/bits)   |
| [@maks11060/otp][@maks11060/otp]       |    [![JSR][@maks11060/otp badge]][@maks11060/otp]    | [github](https://github.com/MAKS11060/otp)    |

[@maks11060/kv]: https://jsr.io/@maks11060/kv
[@maks11060/kv badge]: https://jsr.io/badges/@maks11060/kv
[@maks11060/web]: https://jsr.io/@maks11060/web
[@maks11060/web badge]: https://jsr.io/badges/@maks11060/web
[@maks11060/oauth2]: https://jsr.io/@maks11060/oauth2
[@maks11060/oauth2 badge]: https://jsr.io/badges/@maks11060/oauth2
[@maks11060/openapi]: https://jsr.io/@maks11060/openapi
[@maks11060/openapi badge]: https://jsr.io/badges/@maks11060/openapi
[@maks11060/webauthn]: https://jsr.io/@maks11060/webauthn
[@maks11060/webauthn badge]: https://jsr.io/badges/@maks11060/webauthn
[@maks11060/crypto]: https://jsr.io/@maks11060/crypto
[@maks11060/crypto badge]: https://jsr.io/badges/@maks11060/crypto
[@maks11060/otp]: https://jsr.io/@maks11060/otp
[@maks11060/otp badge]: https://jsr.io/badges/@maks11060/otp
[@maks11060/bits]: https://jsr.io/@maks11060/bits
[@maks11060/bits badge]: https://jsr.io/badges/@maks11060/bits

## Install

```ps
deno add jsr:@maks11060/web
```

```ps
pnpm jsr:@maks11060/we
```

```ps
npx jsr add @maks11060/web
```

</details>

## Web

**Features:**

- [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) with middleware
- [BroadcastChannel](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) with types
- [URLPattern](https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API) with typed exec (WIP)

<details>
<summary>Usage example</summary>

#### Fetch with middleware

```ts
import {Fetch} from '@maks11060/web/fetch'

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
```

#### BroadcastChannel with types

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

#### URLPattern with typed exec (WIP)

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

</details>

## Webauthn

implementation of the `Webauthn` api for a server with a browser-based api

## Openapi

Openapi 3.1 Schema builder.

- [Usage example (github.com/maks11060/openapi)](https://github.com/MAKS11060/openapi)

## Kv. Based on [Deno.Kv](https://docs.deno.com/api/deno/~/Deno.Kv)

<details>
<summary>Usage example</summary>

```jsonc
// deno.json
{
  "unstable": [
    "kv"
  ]
}
```

```ts
import {kvModel} from '@maks11060/kv'
import {z} from 'zod'

using kv = await Deno.openKv(':memory:')

const userSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(50),
})
const passwdSchema = z.object({
  id: z.string(),
  passwd: z.string().min(4).max(60),
})
const userRegisterSchema = z.object({
  username: userSchema.shape.username,
  password: passwdSchema.shape.passwd,
})
const userLoginSchema = userRegisterSchema.pick({username: true, password: true})

const userModel = kvModel(kv, userSchema, {
  prefix: 'user',
  primaryKey: 'id',
  index: {
    username: {key: (user) => user.username.toLowerCase()},
  },
})
const passwdModel = kvModel(kv, passwdSchema, {
  prefix: 'passwd',
  primaryKey: 'id',
})

const isUsernameAvailable = async (username: string) => {
  return !await userModel.findByIndex('username', username)
}

const registerUser = async (data: z.input<typeof userRegisterSchema>) => {
  const op = userModel.atomic()
  const user = await userModel.create({username: data.username}, {op, transaction: true})
  const passwd = await passwdModel.create({passwd: data.password}, {op, key: user.id})

  return user
}

const loginUser = async (data: z.input<typeof userLoginSchema>) => {
  const user = await userModel.findByIndex('username', data.username, {resolve: true})
  if (!user) throw new Error('User not found')

  const passwd = await passwdModel.find(user.id)
  if (!passwd || passwd.passwd !== data.password) throw new Error('Password invalid')

  return user
}
```
