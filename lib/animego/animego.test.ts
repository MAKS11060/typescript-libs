import {getAnime, getAnimePage} from './animego.ts'

Deno.test('Test 115545', async (t) => {
  const data = await getAnime(1)
  console.log(data)
})

Deno.test('Test 921473', async (t) => {
  const animePage = await getAnimePage('https://animego.org/anime/rezero-zhizn-s-nulya-v-alternativnom-mire-3-2641')
  // const animePage =await getAnimePage('https://animego.org/anime/cikl-istoriy-mezhsezone-i-sezon-monstrov-2629')
  // const animePage =await getAnimePage('https://animego.org/anime/etot-zamechatelnyy-mir-3-2538')
  console.log(animePage)
})
