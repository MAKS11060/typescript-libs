# OpenAPI 3 Builder

Builder for OpenAPI 3 schemas

## Create Doc

```ts
import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
import {z} from 'zod'

const doc = createDoc({
  plugins: {schema: [zodPlugin()]},
  info: {title: 'OpenAPI 3 Schema', version: '1.0.0'},
})

console.log(doc.toDoc()) //      get schema object
console.log(doc.toJSON(true)) // output in json format
console.log(doc.toYAML()) //     output in yaml format
```

## Examples

### Example 1: Basic API Documentation

```ts
import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
import {z} from 'zod'

const doc = createDoc({
  plugins: {schema: [zodPlugin()]},
  info: {title: 'Todo API', version: '1.0.0'},
})

doc
  .addPath('/todos')
  .get((t) => {
    t.summary('Get all todos')
    t.response(200, (t) => {
      t.content(
        'application/json',
        z.array(z.object({id: z.number(), title: z.string()})),
      )
    })
  })
  .post((t) => {
    t.summary('Create a new todo')
    t.requestBody((t) => {
      t.content(
        'application/json',
        z.object({title: z.string()}),
      )
    })
    t.response(201, (t) => {
      t.content(
        'application/json',
        z.object({id: z.number(), title: z.string()}),
      )
    })
  })

console.log(doc.toYAML())
```

### Example 2

```ts
import {createDoc} from '@maks11060/openapi'
import {zodPlugin} from '@maks11060/openapi/zod'
import {z} from 'zod'

const doc = createDoc({
  plugins: {schema: [zodPlugin()]},
  info: {title: 'Protected User API', version: '1.0.0'},
  tags: [{name: 'users'}],
})

doc.server({url: 'https://example.com'})

const oauth2 = doc.addSecuritySchema.oauth2('OAuth2', {
  authorizationCode: {
    authorizationUrl: 'https://example.com/authorize',
    tokenUrl: 'https://example.com/api/token',
    scopes: {
      read: 'Access user data (view profiles, comments, etc)',
      edit: 'Modify user data (update profile, change settings, etc)',
    },
  },
})

const unauthorizedResponse = doc.addResponse('Unauthorized', (t) => {
  t.content('application/json', z.object({error: z.string()}))
    .example('Example', (t) => t.value({error: 'Unauthorized: Please authenticate to access this resource'}))
})

const user = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().optional(),
  createdAt: z.iso.datetime(),
})

doc
  .addPath('/user')
  .get((t) => {
    t.tag('users')
    t.summary('Get the authenticated user')
    t.describe('Retrieve current user profile information')
    t.security(oauth2, ['read'])

    t.response(200, (t) => {
      t.content('application/json', user)
        .example('User', (t) =>
          t.value({
            id: '1',
            username: 'user1',
            email: 'user@example.com',
            createdAt: new Date().toISOString(),
          }))
    })
    t.response(401, unauthorizedResponse)
  })
  .patch((t) => {
    t.tag('users')
    t.describe('Update user profile')
    t.security(oauth2, ['edit'])

    t.response(200, (t) => {
      t.content('application/json', user)
        .example('User', (t) =>
          t.value({
            id: '1',
            username: 'updated_user',
            email: 'newuser@example.com',
            createdAt: new Date().toISOString(),
          }))
    })
    t.response(401, unauthorizedResponse)
  })

console.log(doc.toJSON(true)
```
