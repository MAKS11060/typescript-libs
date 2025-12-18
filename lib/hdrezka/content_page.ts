import {DOMParser, Element} from 'jsr:@b-fuze/deno-dom'
import {CustomFetch} from '../../web/types.ts'
import {GetURI, getURI, parseDateString, ua} from './_utils.ts'

type ContentPageOptions = CustomFetch & {
  headers?: HeadersInit
}

export const MediaType = ['films', 'series', 'animation', 'cartoons'] as const

export type HdrezkaMediaType = (typeof MediaType)[number]

const trim = (v: string) => v.trim()

const parseContentPage = (text: string) => {
  const doc = new DOMParser().parseFromString(text, 'text/html')
  const contentMain = doc.body.querySelector('.b-content__main')

  const title = contentMain?.querySelector('.b-post__title')?.textContent.trim() || null
  const titleOrig = contentMain?.querySelector('.b-post__origtitle')?.textContent.trim() || null

  // poster
  const postInfoTableLeft = contentMain?.querySelector('.b-post__infotable_left')
  const posterLg = postInfoTableLeft?.querySelector('a')?.getAttribute('href') || null
  const posterSm = postInfoTableLeft?.querySelector('img')?.getAttribute('src') || null

  // info
  const postInfo = contentMain?.querySelector('.b-post__info')!

  // table rows
  const postEntries = Array.from(postInfo.querySelectorAll('tbody > tr'), (e) => [
    e.querySelector('h2')?.textContent,
    e,
  ])
  const post = Object.fromEntries(postEntries) as Record<string, Element>

  // rating
  const ratings = Array.from(post['Рейтинги']?.querySelectorAll('.b-post__info_rates'), (e) => ({
    type: e.querySelector('a')?.textContent!,
    score: parseFloat(e.querySelector('span')?.textContent!),
    count: parseInt(e.querySelector('i')?.textContent?.match(/\d+/g)?.join('') || '0'),
  }))

  // lists (top)
  const lists = Array.from(post['Входит в списки'].querySelectorAll('td:nth-child(2) a'), (el) => ({
    href: el.getAttribute('href'),
    text: el.textContent,
    place: parseInt((el.nextSibling?.textContent.match(/\((\d+)/) || [, 0])[1] as string, 10),
  }))

  // slogan
  const slogan = post['Слоган']?.querySelector('td:nth-child(2)')?.textContent || null

  // release date
  const releaseDate = parseDateString(post['Дата выхода']?.querySelector('td:nth-child(2)')?.textContent)

  // countries
  const countries = Array.from(post['Страна']?.querySelectorAll('td:nth-child(2) a'), (el) => el.textContent)

  // genres
  const genreStr = post['Жанр']?.querySelector('td:nth-child(2)')?.textContent || ''
  const genres = genreStr?.split(',').map(trim)

  // dubs
  const dubsStr = post['В переводе']?.querySelector('td:nth-child(2)')?.textContent
  const dubs = dubsStr?.split(' и ').join(',').split(',').map(trim) || []

  // duration in min
  const durationStr = post['Время']?.querySelector('td:nth-child(2)')?.textContent || ''
  const duration = parseInt(durationStr.split(' ', 1).join(''), 10)

  // post['Режиссер']?.textContent || null
  // post['Возраст']?.textContent || null

  // collections
  const collections = Array.from(post['Из серии'].querySelectorAll('td:nth-child(2) a'), (el) => ({
    href: el.getAttribute('href'),
    text: el.textContent,
  }))

  // post['В ролях актеры']?.textContent || null
  // console.log(post)

  // description
  const description = contentMain?.querySelector('.b-post__description_text')?.textContent?.trim() || null

  // local rating
  const ratingEl = contentMain?.querySelector('.b-post__rating')
  const count = Number(ratingEl?.querySelector('.votes > span')?.textContent)
  const score = Number(ratingEl?.querySelector('.num')?.textContent)
  if (count && score) ratings.push({type: 'hdrezka', score, count})

  // related content
  const related = Array.from(contentMain?.querySelectorAll('.b-post__partcontent_item:not(.current)')!, (e) => {
    return {
      href: e.getAttribute('data-url'),
      title: e.querySelector('.title')?.textContent || null,
      year: Number(e.querySelector('.year')?.textContent.split(' ', 2).at(0)) || null,
      rating: Number(e.querySelector('.rating')?.textContent) || null,
    }
  })

  // episodes
  const episodesTable = contentMain?.querySelectorAll('.b-post__schedule .b-post__schedule_table tbody tr') || []
  const episodes = Array.from(episodesTable, (e) => {
    // console.log(e.textContent)
    // const [season, , episode] = ().split(' ', 4)!
    const season_episode = e.querySelector('.td-1')?.textContent.split(' ', 4) || []
    const title = e.querySelector('.td-2 b')?.textContent || null
    const titleAlt = e.querySelector('.td-2 span')?.textContent || null
    const airDate = e.querySelector('.td-4')?.textContent

    return {
      season: parseInt(season_episode[0]),
      episodes: parseInt(season_episode[2]),
      airDate: parseDateString(airDate),
      title,
      titleAlt,
    }
  }).filter((v) => v.season)

  return {
    title,
    titleOrig,
    poster: {lg: posterLg, md: posterSm},
    ratings,
    countries,
    genres,
    duration,
    releaseDate,
    slogan,
    description,

    dubs,
    lists,
    collections,
    related,
    episodes,
  }
}

export const contentPage = async (uri: string, options?: ContentPageOptions & GetURI) => {
  try {
    const _uri = getURI(new URL(uri).pathname, options)
    const type = _uri.pathname
      .split('/', 2)
      .filter((v) => v)[0]
      .toLowerCase() as HdrezkaMediaType

    if (!MediaType.includes(type)) {
      throw new Error(`Unknown media type: '${type}'`)
    }

    const _fetch = options?.fetch ?? fetch
    const response = await _fetch(_uri, {
      headers: new Headers({
        'user-agent': ua,
        ...options?.headers,
      }),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${_uri}: ${response.statusText}`)
    }

    const text = await response.text()
    return {type, ...parseContentPage(text)}
  } catch (error) {
    console.error('Error parsing page:', error)
    throw error
  }
}
