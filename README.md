# Deno-libs

[![JSR Score](https://jsr.io/badges/@maks11060)](https://jsr.io/@maks11060)

| Package                            |                         Link                         |
| ---------------------------------- | :--------------------------------------------------: |
| [@maks11060/kv][@maks11060/kv]     |     [![JSR][@maks11060/kv badge]][@maks11060/kv]     |
| [@maks11060/web][@maks11060/web]   |    [![JSR][@maks11060/web badge]][@maks11060/web]    |
| [@maks11060/oauth2][@maks11060/kv] | [![JSR][@maks11060/oauth2 badge]][@maks11060/oauth2] |

[@maks11060/kv]: https://jsr.io/@maks11060/kv
[@maks11060/web]: https://jsr.io/@maks11060/web
[@maks11060/oauth2]: https://jsr.io/@maks11060/oauth2

[@maks11060/kv badge]: https://jsr.io/badges/@maks11060/kv
[@maks11060/web badge]: https://jsr.io/badges/@maks11060/web
[@maks11060/oauth2 badge]: https://jsr.io/badges/@maks11060/oauth2


## Install

### Deno
```ps
deno add jsr:@maks11060/web
```
### Other runtimes
```ps
npx jsr add @maks11060/kv
```
```ps
pnpm dlx jsr add @maks11060/kv
```

## kv model example
```ts
#!/usr/bin/env -S deno run -A

import {kvProvider, printKV} from 'jsr:@maks11060/kv'
import {z} from 'npm:zod'

const kv = await Deno.openKv(':memory:')
const kvLib = kvProvider(kv)

const postSchema = z.object({
  id: z.string(),
  title: z.string().trim().max(256),
  content: z.string().optional(),
  tags: z.array(z.string()),
})

const postModel = kvLib.model(postSchema, {
  prefix: 'post',
  primaryKey: 'id',
  index: {
    // create index 'tags'
    tags: {
      relation: 'many',
      key: (post) => post.tags.map((v) => v.toLowerCase()),
    },
    // create index 'name'
    name: {
      relation: 'many',
      key: (post) => post.title.toLowerCase(),
    },
  },
})

// Create post
const post1 = await postModel.create({title: 'Post 1', tags: ['dev', 'deno', 'backend']})
const post2 = await postModel.create({title: 'Post 2', tags: ['dev', 'node', 'backend']})
const post3 = await postModel.create({title: 'Post 3', tags: ['frontend', 'css', 'html', 'js']})

// Get the latest post
const postList = await postModel.findMany({limit: 1, reverse: true})
// [ {id: '01JMDGZ7YJ4ZECVF5ZVSE1S8PX', title: 'Post 3', tags: ['frontend', 'css', 'html', 'js']} ]

// Get a post relative to the previous Post
const postListWithOffset = await postModel.findMany({
  limit: 1,
  reverse: true,
  offset: postList[0].id, // post3 id
})
// [ {id: '01JMDHKV7353R802KS1WJV2JX1', title: 'Post 2', tags: ['dev', 'node', 'backend']} ]

// Find a post ids by index
const postIdsByIndex = await postModel.findByIndex('tags', 'dev')
// [ "01JMDHH8J75B0GYX6XTZXZ5NG2", "01JMDHH8J8JMS27BA5M1EX4ARG" ]

// Find a post by index and resolve
const postsByIndex = await postModel.findByIndex('tags', 'dev', {resolve: true})
// [
//   {id: '01JMDHKV71N350W96TATF02P0H', title: 'Post 1', tags: ['dev', 'deno', 'backend']},
//   {id: '01JMDHKV7353R802KS1WJV2JX1', title: 'Post 2', tags: ['dev', 'node', 'backend']},
// ]

// Update post
await postModel.update(
  post3.id,
  (val) => {
    const currentTags = val.tags.filter((v) => v !== 'js')
    currentTags.push('ts')
    return {
      tags: currentTags,
    }
  },
  {force: true /* Allow override 'post' index */}
)
const updatedPost3 = await postModel.find(post3.id)
// {id: '01JMDGZ7YJ4ZECVF5ZVSE1S8PX', title: 'Post 3', tags: ['frontend', 'css', 'html', 'ts']}

// View in the storage
// await printKV(kv, ['post-tags']) // tags
await printKV(kv)
```

## Web
```ts
import {createCachedFetch} from '@maks11060/web'

const fetch = await createCachedFetch({
  name: 'cache-1',
  ttl: 60 * 60 * 24, // 1 day
  log: true,
})
```

## wip/dev
```ts
// OAuth2
import {createGithubOauth2, oauth2Authorize, oauth2ExchangeCode} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/oauth2/mod.ts'

const config = createGithubOauth2({
  clientId: Deno.env.get('GITHUB_CLIENT_ID')!,
  clientSecret: Deno.env.get('GITHUB_CLIENT_SECRET')!,
  redirectUri: Deno.env.get('OAUTH2_REDIRECT')!,
})
const authorizeUri = oauth2Authorize(config, 'state-12345')
console.log(authorizeUri.toString())


// Hono helper
import {createHonoVar} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/hono/mod.ts'
import {Hono} from 'hono'

const vars = createHonoVar(async (c) => {
  return {
    data: 'text',
    foo(data: string) {
      console.log(data)
      return data
    }
  }
})

const app = new Hono()
  .get('/test', vars, (c) => {
    return c.text(c.var.foo('hello'))
  })


// Parser
import * as animego from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/api/animego/animego.ts'
import * as hdrezka from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/api/hdrezka/hdrezka.ts'


// CLI
import {promptSelect, promptMultipleSelect} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/cli/prompt.ts'


// Debugging
import {printBuf} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/debug/mod.ts'

printBuf(crypto.getRandomValues(new Uint8Array(40)))
//       40 00 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15
// 00000000 58 f7 65 1f 45 77 10 98 23 b7 60 c4 fa f8 fe a0
// 00000010 2b 8c fd 3d fd 9c a5 d3 07 9b d5 70 48 95 67 aa
// 00000020 d3 63 1c 4b a2 64 db 5d


// Random utilities
import {weekCache} from 'https://raw.githubusercontent.com/MAKS11060/deno-libs/main/lib/mod.ts'

const authHook = useWeakCache((headers: Headers) => {
  if (headers.get('authorization') == 'Bearer test') return true
})

const ctx = {} // any object.
const headers = new Headers({'Authorization': 'Bearer test'})
console.log(await authHook(ctx, headers))
console.log(await authHook(ctx, headers)) // from cache


// createModel old version
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
