#!/usr/bin/env -S deno test -A --watch

import {createCachedFetch} from '../../web/cache.ts'
import {createProxyFetch} from '../../web/proxy.ts'
import {getContentPage, searchPage} from './hdrezka.ts'

const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev'})
const fetch = await createCachedFetch({
  // fetch: proxyFetch,
  name: 'hdrezka',
  ttl: 60 * 60 * 24 * 30,
  deleteExpired: true,
  log: true,
})

Deno.test('parse', async () => {
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
  const data = await getContentPage('https://hdrezka.me/films/adventures/1171-nazad-v-buduschee-1985.html', {fetch})
  console.log(data)
})

Deno.test('searchPage', async () => {
  const list = await searchPage({fetch, type: 'new', filter: 'popular', page: 3})
  console.log(list)
})
