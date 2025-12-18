import {page, search} from './mod.ts'

Deno.test('Test 016143', async (t) => {
  const href = 'https://hdrezka.me/animation/adventures/80693-molchalivaya-vedma-tayna-molchalivoy-kolduni-2025.html'
  const data = await page.resolve(href)
  console.log(data)
})

Deno.test('Test 551983', async (t) => {
  const data = await search.search
  console.log(data)
})
