#!/usr/bin/env -S deno test -A --watch

import {createCachedFetch} from '../../web/cache.ts'
import {getContentPage} from './hdrezka.ts'

Deno.test('parse', async () => {
  const fetch = await createCachedFetch({
    name: 'hdrezka',
    ttl: 60 * 60 * 24 * 30,
    log: true,
  })

  const links = [
    'https://hdrezka.me/films/adventures/1171-nazad-v-buduschee-1985.html',
    'https://hdrezka.me/series/fiction/1745-doktor-kto-2005.html',
    'https://hdrezka.me/animation/adventures/72100-rebenok-aydola-2024.html',
    'https://hdrezka.me/cartoons/comedy/1760-yuzhnyy-park-1997.html',
  ]

  // fetch
  for (const uri of links) {
    const data = await getContentPage(uri, {fetch})
    console.log(data.title, data.titleOrig, data.score)
  }
})

Deno.test('parse rating', async () => {
  const fetch = await createCachedFetch({
    name: 'hdrezka',
    ttl: 60 * 60 * 24 * 30,
    log: true,
  })

  const data = await getContentPage('https://hdrezka.me/films/adventures/1171-nazad-v-buduschee-1985.html', {fetch})
  console.log(data)
})
