import {URLPatternTyped} from './url-pattern.ts'

Deno.test('Test 169101', async (t) => {
  const p = new URLPatternTyped({
    pathname: '/users/:userId{/posts/:postId}?',
  })

  await t.step('/users/123', async (t) => {
    const res = p.exec({pathname: '/users/123'})!
    console.log(
      res.pathname.groups satisfies {userId: string; postId?: string},
    )
  })

  await t.step('/users/123/posts/456', async (t) => {
    const res = p.exec({pathname: '/users/123/posts/456'})!
    console.log(
      res.pathname.groups satisfies {userId: string; postId?: string},
    )
  })
})

Deno.test('Test 129221', async (t) => {
  new URLPatternTyped({pathname: '/posts/:id'})
    .exec({pathname: ''})?.pathname.groups // Record<string, string | undefined> & {id: string}
})

Deno.test('Test 005252', async (t) => {
  console.log(
    new URLPatternTyped({pathname: '/posts/:postId/*'})
      .exec({pathname: '/posts/12/sdf'})?.pathname.groups,
  )

  console.log(
    new URLPatternTyped({pathname: '/img/:hash([a-fA-F0-9]{32}){/info}?'})
      .exec({pathname: '/img/11112222333344445555666677778888/info'})?.pathname.groups,
  )

  console.log(
    new URLPatternTyped({pathname: '/books/:id+'})
      .exec({pathname: '/books/1/2/3'})?.pathname.groups,
  )
})

Deno.test('Test 614132', async (t) => {
  // const p = new URLPatternTyped({pathname: '/users{/:userId}?/posts{/:postId}?'})
  const p = new URLPatternTyped({pathname: '/users/:userId?/posts/:postId?'})
  console.log(p.pathname)
  console.log(p.exec({pathname: '/users'})?.pathname.groups)
  console.log(p.exec({pathname: '/users/'})?.pathname.groups)
  console.log(p.exec({pathname: '/users/posts/2'})?.pathname.groups)
  console.log(p.exec({pathname: '/users/1/posts'})?.pathname.groups)
  console.log(p.exec({pathname: '/users/1/posts/2'})?.pathname.groups)
})

Deno.test('Test 780225', async (t) => {
  const p = new URLPatternTyped({pathname: '/books/:id+'})
  console.log(p.pathname)
  console.log(p.exec({pathname: '/books/1asd/asd'})?.pathname.groups)
})

Deno.test('Test 7802251', async (t) => {
  const p = new URLPatternTyped({pathname: '/books/:id*'})
  console.log(p.pathname)
  console.log(p.exec({pathname: '/books/1'})?.pathname.groups)
})

Deno.test('Test 780232', async (t) => {
  const p = new URLPatternTyped({pathname: '/users/:userId{/posts/:postId}?'})
  console.log(p.pathname)
  // console.log(p.exec({pathname: '/books/1'})?.pathname.groups)
})

// --- TEST ---
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false
type Expect<T extends true> = T

type Test = [
  // Expect<Equal<1, 1>>,
  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/users/:userId'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {userId: string}
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/users/:userId{/posts/:postId}?'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {userId: string} & {postId: string | undefined}
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/img/:hash([a-fA-F0-9]{32}){/info}?'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {
            hash: string
          }
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '(/b.*)'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: unknown
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '(/path$)'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: unknown
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '(/a(?=b).*)'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: unknown
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/books/(\\d+)'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: unknown
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/books/:id?'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {
            id: string | undefined
          }
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/books/:id+'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {
            id: string
          }
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/books/:id*'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {
            id: string
          }
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/users{/:userId}/posts{/:postId}?'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {
            postId: string | undefined
          } & {
            userId: string
          }
        }
      }) | null
    >
  >,

  Expect<
    Equal<
      ReturnType<URLPatternTyped<{pathname: '/users{/:userId}?/posts{/:postId}?'}>['exec']>,
      (URLPatternResult & {
        pathname: {
          input: string
          groups: {
            postId: string | undefined
          } & {
            userId: string | undefined
          }
        }
      }) | null
    >
  >,
]
