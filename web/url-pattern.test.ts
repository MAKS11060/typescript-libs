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
