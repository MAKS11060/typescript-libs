# Deno-libs

[![JSR Score](https://jsr.io/badges/@maks11060)](https://jsr.io/@maks11060)
[![CI](https://github.com/MAKS11060/typescript-libs/actions/workflows/ci.yml/badge.svg)](https://github.com/MAKS11060/typescript-libs/actions/workflows/ci.yml)

| Package                                    |                           Link                           |
| ------------------------------------------ | :------------------------------------------------------: |
| [@maks11060/kv][@maks11060/kv]             |       [![JSR][@maks11060/kv badge]][@maks11060/kv]       |
| [@maks11060/web][@maks11060/web]           |      [![JSR][@maks11060/web badge]][@maks11060/web]      |
| [@maks11060/oauth2][@maks11060/oauth2]     |   [![JSR][@maks11060/oauth2 badge]][@maks11060/oauth2]   |
| [@maks11060/openapi][@maks11060/openapi]   |  [![JSR][@maks11060/openapi badge]][@maks11060/openapi]  |
| [@maks11060/webauthn][@maks11060/webauthn] | [![JSR][@maks11060/webauthn badge]][@maks11060/webauthn] |

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

## Install

```ps
deno add jsr:@maks11060/web
```

```ps
pnpm jsr:@maks11060/kv
```

```ps
npx jsr add @maks11060/kv
```

### Kv

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
```

<details>
<summary>Usage example</summary>

```ts
import {kvModel} from '@maks11060/kv'

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

</details>

### Web

<details>
<summary>Usage example</summary>

```ts
import {createCachedFetch} from '@maks11060/web'

const fetch = await createCachedFetch({
  name: 'cache-1',
  ttl: 60 * 60 * 24, // 1 day
  log: true,
})
```

</details>
