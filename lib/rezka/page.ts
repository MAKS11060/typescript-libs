import {DOMParser, type Element} from '@b-fuze/deno-dom'
import {userAgent} from './config.ts'
import type {BaseOptions} from './types.ts'
import {parseDateString, parseUri} from './utils.ts'

export const Kind = ['films', 'series', 'animation', 'cartoons'] as const
export type RezkaKindType = (typeof Kind)[number]

const trim = (v: string) => v.trim()

export const resolve = async (href: string | URL, options?: BaseOptions) => {
  try {
    const uri = parseUri(href)
    if (!Kind.includes(uri.type as any)) {
      throw new Error('href: kind type invalid')
    }

    const _fetch = options?.fetch ?? fetch
    const headers = new Headers({
      'user-agent': options?.userAgent ?? userAgent,
      ...options?.headers,
    })

    const response = await _fetch(href.toString(), {headers})
    if (!response.ok) {
      throw new Error(`[Rezka] Failed to fetch ${href.toString()}: ${response.statusText}`)
    }

    const html = await response.text()
    const data = parse(html)
    if (!data) return null

    return {
      url: response.url || href,
      type: uri.type as RezkaKindType,
      ...data,
    } as const
  } catch (e) {
    console.error(`[Rezka] Parse failed`, e)
  }

  return null
}

export const parse = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const contentMain = doc.body.querySelector('.b-content__main')
  if (!contentMain) return null

  // title
  const title = contentMain?.querySelector('.b-post__title')?.textContent.trim() || null
  const titleOrig = contentMain?.querySelector('.b-post__origtitle')?.textContent.trim() || null

  // status
  const statusStr = contentMain?.querySelector('.b-post__infolast')?.textContent.trim() || null
  const status = statusStr?.toLowerCase()?.startsWith('завершен') ? 'released' : 'unknown'

  // poster
  const postInfoTableLeft = contentMain?.querySelector('.b-post__infotable_left')
  const poster = {
    lg: postInfoTableLeft?.querySelector('a')?.getAttribute('href') || null,
    md: postInfoTableLeft?.querySelector('img')?.getAttribute('src') || null,
  }

  // info
  const postInfo = contentMain?.querySelector('.b-post__info')!
  if (!postInfo) return null

  // table rows
  const postEntries = Array.from(
    postInfo.querySelectorAll('tbody > tr'),
    (e) => [e.querySelector('h2')?.textContent, e],
  )
  const post = Object.fromEntries(postEntries) as Record<string, Element>

  // rating (Кинопоиск, IMDB)
  const ratings = Array.from(
    post['Рейтинги']?.querySelectorAll('.b-post__info_rates') || [],
    (e) => {
      const scoreText = e.querySelector('span')?.textContent
      const countText = e.querySelector('i')?.textContent?.match(/\d+/g)?.join('') || '0'

      return {
        type: e.querySelector('a')?.textContent || '',
        score: scoreText ? parseFloat(scoreText) : 0,
        count: parseInt(countText, 10),
      }
    },
  ).filter((r) => r.type && !isNaN(r.score) && r.score > 0)

  // rating (Rezka)
  const ratingEl = contentMain?.querySelector('.b-post__rating')
  const count = Number(ratingEl?.querySelector('.votes > span')?.textContent)
  const score = Number(ratingEl?.querySelector('.num')?.textContent)
  if (count && score) ratings.push({type: 'hdrezka', score, count})

  // lists (top)
  const lists = Array.from(
    post['Входит в списки']?.querySelectorAll('td:nth-child(2) a') || [],
    (el) => ({
      href: el.getAttribute('href'),
      text: el.textContent,
      place: parseInt((el.nextSibling?.textContent.match(/\((\d+)/) || [, 0])[1] as string, 10),
    }),
  )

  // slogan
  const slogan = post['Слоган']?.querySelector('td:nth-child(2)')?.textContent || null

  // release date
  const releaseDate = parseDateString(post['Дата выхода']?.querySelector('td:nth-child(2)')?.textContent)

  // countries
  const countries = Array.from(
    post['Страна']?.querySelectorAll('td:nth-child(2) a'),
    (el) => el.textContent,
  )

  // genres
  const genres = post['Жанр']?.querySelector('td:nth-child(2)')?.textContent?.split(',').map(trim) || []

  // dubs
  const dubs = post['В переводе']?.querySelector('td:nth-child(2)')?.textContent
    ?.split(' и ').join(',').split(',').map(trim) || []

  // duration in min
  const durationStr = post['Время']?.querySelector('td:nth-child(2)')?.textContent || ''
  const duration = parseInt(durationStr.split(' ', 1).join(''), 10) || null

  const directors = Array.from(
    post['Режиссер']?.querySelectorAll('td:nth-child(2) a') || [],
    (el) => ({
      name: el?.textContent || null,
      href: el?.getAttribute('href'),
      poster: el.parentElement?.getAttribute('data-photo') === 'null'
        ? null
        : el.parentElement?.getAttribute('data-photo'),
    }),
  )

  const rating = post['Возраст']?.querySelector('span')?.textContent || null

  // collections
  const collections = Array.from(
    post['Из серии']?.querySelectorAll('td:nth-child(2) a') || [],
    (el) => ({
      href: el.getAttribute('href'),
      text: el.textContent,
    }),
  )

  const persons = Array.from(
    post['В ролях актеры']?.querySelectorAll(' a') || [],
    (el) => ({
      name: el?.textContent || null,
      href: el?.getAttribute('href'),
      poster: el.parentElement?.getAttribute('data-photo') === 'null'
        ? null
        : el.parentElement?.getAttribute('data-photo'),
    }),
  )

  // description
  const description = contentMain?.querySelector('.b-post__description_text')?.textContent?.trim() || null

  // related content
  const related = Array.from(
    contentMain?.querySelectorAll('.b-post__partcontent_item:not(.current)')!,
    (e) => ({
      href: e.getAttribute('data-url'),
      title: e.querySelector('.title')?.textContent || null,
      year: Number(e.querySelector('.year')?.textContent.split(' ', 2).at(0)) || null,
      rating: Number(e.querySelector('.rating')?.textContent) || null,
    }),
  )

  // episodes
  const episodes = Array.from(
    contentMain?.querySelectorAll('.b-post__schedule .b-post__schedule_table tbody tr')!,
    (e) => {
      const textContent = e.querySelector('.td-1')?.textContent || ''
      const parts = textContent.split(' ', 4)
      const title = e.querySelector('.td-2 b')?.textContent || null
      const titleAlt = e.querySelector('.td-2 span')?.textContent || null
      const airDate = e.querySelector('.td-4')?.textContent

      return {
        season: parts[0] ? parseInt(parts[0]) : 0,
        episodes: parts[2] ? parseInt(parts[2]) : 0,
        title,
        titleAlt,
        airDate: parseDateString(airDate),
      }
    },
  ).filter((v) => v.season && v.episodes)

  return {
    title,
    titleOrig,
    poster,
    status,
    ratings,
    releaseDate,
    countries,
    genres,
    duration,
    rating,
    dubs,
    lists,
    slogan,
    description,
    collections,
    directors,
    persons,
    related,
    episodes,
  } as const
}
