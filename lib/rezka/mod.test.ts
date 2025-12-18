import {Rezka} from './mod.ts'

Deno.test('Test 016143', async (t) => {
  const href = 'https://hdrezka.me/animation/adventures/80693-molchalivaya-vedma-tayna-molchalivoy-kolduni-2025.html'
  const data = await Rezka.page(href)
  console.log(data)
})

Deno.test('Test 551983', async (t) => {
  const data = await Rezka.search({type: 'films'})
  console.log(data)
})
