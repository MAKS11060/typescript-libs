import {expect} from '@std/expect'
import {parseDateString, parseUri} from './utils.ts'

Deno.test('parseDateString()', () => {
  expect(
    parseDateString('11 января 2011')?.toLocaleString(),
  ).toEqual('11.01.2011, 00:00:00')

  expect(
    parseDateString('11 январ 2011'),
  ).toEqual(null)

  expect(
    parseDateString(`31 апреля 2011`),
  ).toEqual(null)
})

Deno.test('parseUri()', async (t) => {
  expect(
    parseUri(
      'https://hdrezka.me/cartoons/comedy/1760-yuzhny-park-1997-latest/111-hdrezka-studio/27-season/3-episode.html',
    ),
  ).toEqual({
    hostname: 'hdrezka.me',
    type: 'cartoons',
    genre: 'comedy',
    title: '1760-yuzhny-park-1997',
    id: '1760',
    dub: '111-hdrezka-studio',
    season: '27-season',
    episode: '3-episode',
  })
})
