#!/usr/bin/env -S deno run -A --watch-hmr

import {z} from 'zod'
import '../../lib/dev/yaml.ts'
import {createDoc} from '../src/openapi.ts'
import {zodPlugin} from '../src/plugins/zod.ts'

export const doc = createDoc({
  // strict: false,
  plugins: {
    schema: [zodPlugin()],
  },

  info: {title: '', version: ''},
  tags: [{name: 'A'}, {name: 'B'}],
})

// setTimeout(() => console.log(doc.toDoc()))
setTimeout(() => console.yaml(doc.toDoc()))

////////////////////////////////
const ex1 = doc.addExample<string>('ex1', (t) => {
  t.value('123')
})

const testHeader = doc.addHeader('Test', (t) => {
  t.schema(z.string()) //
    .example('ex1', ex1)
})

const res = doc.addResponse('Res', (t) => {
  t.header('a', (t) => {
    t.schema(z.object()) //
      .example('a', (t) => t.value({}))
  })
})

doc
  .addPath('/') //
  .get((t) => {
    t.response(200, (t) => {
      t.header('x-header', (t) => {
        t.schema({})
      })
      t.header('test', testHeader)
    })
    t.response('default', res)
  })

//

////////////////////////////////
/* const Ex2 = doc.addExample<string>('Ex2', t => {
  t.value('2')
})

doc
  .addPath('/path') //
  .get((t) => {
    t.parameter('query', 'q', (t) => {
      t.schema(z.string()) //
        .example('Ex1', (t) => t.value('1'))
        .example('ex2', Ex2)
    })
  }) */

////////////////////////////////
/* const anon = doc.addSecuritySchema.anonymous()

const apiKey = doc.addSecuritySchema.apiKey('ApiKey', 'query', 'key')

const oauth2 = doc.addSecuritySchema.oauth2('OAuth2', {
  authorizationCode: {
    authorizationUrl: '',
    tokenUrl: '',
    scopes: {
      read: '',
      write: '',
    },
  },
  implicit: {
    authorizationUrl: '',
    tokenUrl: '',
    scopes: {
      'read-user': '',
    },
  },
})

doc.security(anon)
doc.security(apiKey)
doc.security(oauth2, ['read', 'read-user'])

doc.server({url: '1'})

doc
  .addPath('/api/user') //
  .server({url: '2'})
  .get((t) => {
    t.security(anon)
    t.security(oauth2, ['read'])
    t.server({url: '3'})

    t.tag('Test')

    t.requestBody((t) => {
      t.content('application/json', z.string())
    })
    t.response(200, (t) => {})
  }) */

////////////////////////////////
/* const schema = z.string()

const Err = doc.addSchema('Err', z.string())

const Example = doc.addExample('Example', Err, t => {
  t.value('str')
})

const Example2 = doc.addExample('Example2', t => {
  t.value('str')
})

doc.addResponse('Test', (t) => {
  t.describe('Res')
  t.content('application/json', z.string())
})

doc.addRequestBody('Test', (t) => {
  t.describe('Req')
  t.required()
  t.content('application/json', Err) //
    .example('A', (t) => t.value('1'))
    .example('B', (t) => t.value('2'))
    .example('c', Example)
}) */

////////////////////////////////
// const userId = z.string().describe('The user ID')
// const user = z.object({
//   id: userId,
//   username: z.string(),
//   nickname: z.string(),
// })
// const error = z.object({
//   error: z.string(),
// })

// // doc.addSchema('UserID', userId)
// // const User = doc.addSchema('User', user)

// doc.addPath('/api/{ver}', {
//   // ver: t => t.schema(z.string())
//   ver: (t) => t.schema({type: 'string'}),
// }) //
// // .get((t) => {
// //   t.response(200, (t) => {
// //     // t.content('application/json', User)
// //   })
// // })

// const AbcPath = doc.addPathItem('Test', (t) => {
//   t.get((t) => {
//     t.response(200, (t) => {
//       // t.content('application/json', User)
//     })
//   })
// })

// doc.addPath('/path/{a}', AbcPath)
// doc.addPath('/path/{b}', {}, AbcPath)
// doc.addPath(
//   '/path/{c}',
//   {
//     c: (t) => {
//       t.schema(z.string()) //
//         .example('Example1', (t) => t.value('1'))
//         .example('Example2', (t) => t.value('2'))
//     },
//   },
//   AbcPath
// )

// doc
//   .addPath('/a') //
//   .get((t) => {
//     t.response(200, (t) => {
//       t.content('application/json', User)
//     })
//     t.response(400, (t) => {
//       t.content('application/json', error) //
//         .example('Err', (t) => t.value({error: 'Client Error'}))
//     })
//   })

/* const testRes = doc.addResponse('test', (t) => {
  t.content('application/json', User)
})

doc.addParameter('userID', 'query', 'id', (t) => {
  t.schema(userId) //.example('test', (t) => t.value('1'))
})

const example = doc.addExample('Example_1', (t) =>
  t.describe('Example').value('1')
)

doc
  .addPath('/') //
  .get((t) => {
    t.response(200, (t) => {
      t.content('application/json', User)
        .example('a', example)
        .example('b', (v) => v.value({id: '', nickname: '', username: ''}))
    })
    t.response(400, testRes)
  })

doc.addPathItem('Api', (t) => {
  t.get((t) => {
    t.response(200, (t) => {})
  })
})
 */
