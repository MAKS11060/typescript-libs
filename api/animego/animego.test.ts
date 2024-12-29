import {createCachedFetch} from '../../web/cache.ts'

Deno.test('parse', async () => {
  const fetch = await createCachedFetch({
    name: 'animego',
    ttl: 60 * 60 * 24 * 30,
    log: true,
  })
})

// for (const {title, href} of await getAnime(1)) {
//   console.log(href)
// }

// console.log(await getAnimePage('https://animego.org/anime/rezero-zhizn-s-nulya-v-alternativnom-mire-3-2641'))
// console.log(await getAnimePage('https://animego.org/anime/cikl-istoriy-mezhsezone-i-sezon-monstrov-2629'))
// console.log(await getAnimePage('https://animego.org/anime/etot-zamechatelnyy-mir-3-2538'))
