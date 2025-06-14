#!/usr/bin/env -S deno test -A --watch

import { createCachedFetch } from '../../web/cache.ts'
import { createProxyFetch } from '../../web/proxy.ts'
import { getURI } from './_utils.ts'
import { contentPage, search } from './mod.ts'

const proxyFetch = createProxyFetch({proxyUrl: 'https://no-cors.deno.dev'})
const fetch = await createCachedFetch({
  // fetch: proxyFetch,
  name: 'hdrezka',
  ttl: 60 * 60 * 24 * 30,
  deleteExpired: true,
  log: true,
})

Deno.test('getURI', () => {
  const uri = 'https://hdrezka.ag/films/adventures/1171-nazad-v-buduschee-1985.html'
  const _uri = getURI(new URL(uri).pathname)

  console.log(_uri.toString())
})

Deno.test('contentPage', async () => {
  // const uri = 'https://hdrezka.me/films/adventures/1171-nazad-v-buduschee-1985.html'
  // const uri = 'https://hdrezka.me/series/fiction/1745-doktor-kto-2005.html'
  const uri = 'https://hdrezka.me/series/fantasy/45-igra-prestolov-2011.html'
  // const uri = 'https://hdrezka.me/animation/adventures/72100-rebenok-aydola-2024.html'
  // const uri = 'https://hdrezka.me/cartoons/comedy/1760-yuzhnyy-park-1997.html'

  const data = await contentPage(uri, {fetch})
  console.log(data)
})

Deno.test('search', async () => {
  const list = await search({fetch, type: 'new', filter: 'popular', page: 3})
  console.log(list)
})
