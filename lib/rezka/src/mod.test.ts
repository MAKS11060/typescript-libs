import {Rezka} from '@maks11060/lib/rezka'

Deno.test('Test 385047', async (t) => {
  // https://hdrezka.me/animation/
  // https://hdrezka.me/animation/?filter=last
  // https://hdrezka.me/animation/action/
  // https://hdrezka.me/animation/best/
  // https://hdrezka.me/animation/best/drama/2026/
  // https://hdrezka.me/animation/best/comedy/2025/page/2/

  // console.log(await Rezka.catalog.get('anime'))
  console.log(await Rezka.catalog.get('anime', {filter: 'popular', genre: 'action', page: 2}))
  // console.log(await Rezka.catalog.getBest('anime', {genre: 'action', year: 2025}))
  // console.log(await Rezka.catalog.get('series', {}))
  // console.log(await Rezka.catalog.getBest('anime', {year: 2026}))
})
