# Deno-libs

How to import
- `https://raw.githubusercontent.com/MAKS11060/deno-libs/main/:pathToModule`


## Api
```ts
import {} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/api/animego/animego.ts'
import {} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/api/hdrezka/hdrezka.ts'
```

## CLI
```ts
import {
  promptSelect,
  promptMultipleSelect,
} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/cli/prompt.ts'
```

## Debug
```ts
import {printBuf} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/debug/mod.ts'

printBuf(crypto.getRandomValues(new Uint8Array(40)))

//       40 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15
// 00000000 b3 45 cf 2b 90 b3 97 15 79 05 d3 36 d9 bd 3f b7
// 00000010 18 1e ff 65 d5 b8 04 4d 72 1b 51 94 3d 78 7b 6b
// 00000020 cd 5a b3 2b 47 59 53 e6
```

## Deno
### KV Model
```ts
import {createModel} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/deno/mod.ts'
import z from 'zod'

export const kv = await Deno.openKv()

export const userSchema = z.object({
  id: z.string().ulid(),
  username: z.string().trim().min(2).max(64),
  nickname: z.string().trim().min(2).max(64),
  email: z.string().trim().min(3).max(320).email().optional(),
})
export const userModel = createModel(kv, userSchema, {
  prefix: 'user',
  primaryKey: 'id',
  secondaryKeys: ['username', 'email'],
  indexOptions: {
    username: {
      transform: (val) => val.toLowerCase(),
    },
  },
})
```

## Hono
```ts
import {createHonoVar} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/hono/mod.ts'
import {Hono} from 'hono'

const var = createHonoVar(async (c) => {
  return {
    data: 'text',
    foo(data: string) {
      console.log(data)
      return data
    }
  }
})

const app = new Hono()
  .get('/test', var, (c) => {
    return c.text(c.var.foo('hello'))
  })

```

## Lib
```ts
import {weekCache} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/lib/mod.ts'

const authHook = useWeakCache((headers: Headers) => {
  if (headers.get('authorization') == 'Bearer test') return true
})

const ctx = {} // any object.
const headers = new Headers({'Authorization': 'Bearer test'})
console.log(await authHook(ctx, headers))
console.log(await authHook(ctx, headers)) // from cache
```

## Web
```ts
import {createCachedFetch} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/web/cache.ts'

const fetch = await createCachedFetch({
  name: 'cache-1',
  ttl: 60 * 60 * 24, // 1 day
  log: true,
})
```
