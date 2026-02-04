import {DOMParser, type Element, type HTMLDocument} from '@b-fuze/deno-dom'
import {config} from '../core/config.ts'
import type {CatalogType} from '../core/constants.ts'
import {RezkaFetchError, RezkaParseError} from '../core/errors.ts'
import {detectLanguage, parseDateString, parseUri} from '../core/utils.ts'
import type {BaseOptions} from '../types.ts'

export const getDetails = async (url: string | URL, options?: BaseOptions) => {
  const uri = parseUri(url)

  // const _type = Type[uri.type as keyof typeof Type]
  // if (!_type) throw new RezkaValidationError(`Unknown type: ${uri.type}`)

  const _fetch = options?.fetch ?? config.fetch ?? fetch
  const headers = new Headers({
    'user-agent': options?.userAgent ?? config.userAgent!,
    ...config?.headers,
    ...options?.headers,
  })

  const response = await _fetch(url, {headers})
  if (!response.ok) throw new RezkaFetchError(response)

  const html = await response.text()
  const dom = new DOMParser().parseFromString(html, 'text/html')
  const data = parse(dom)

  return {
    get response() {
      return response
    },
    data: {
      url: response.url || url.toString(),
      type: uri.type as keyof typeof CatalogType,
      ...data,
    },
  }
}

const trim = (v: string) => v.trim()

const parse = (doc: HTMLDocument) => {
  const contentMain = doc.body.querySelector('.b-content__main')
  if (!contentMain) throw new RezkaParseError('Empty .b-content__main')

  // title
  const titles = [
    contentMain?.querySelector('.b-post__title')?.textContent.trim(),
    contentMain?.querySelector('.b-post__origtitle')?.textContent.trim(),
  ].filter(Boolean)
    .flatMap((v) => v?.split(' / ')!)
    .map((v) => ({
      name: v!,
      lang: detectLanguage(v!).lang,
    }))

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
  if (!postInfo) throw new RezkaParseError('Empty .b-post__info')

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
      name: el.textContent,
      href: el.getAttribute('href')!,
      place: parseInt((el.nextSibling?.textContent.match(/\((\d+)/) || [, 0])[1] as string, 10),
    }),
  )

  // slogan
  const slogan = post['Слоган']?.querySelector('td:nth-child(2)')?.textContent || null

  // release date
  const releaseDate = parseDateString(post['Дата выхода']?.querySelector('td:nth-child(2)')?.textContent)

  // countries
  const countries = Array.from(
    post['Страна']?.querySelectorAll('td:nth-child(2) a') || [],
    (el) => el.textContent,
  )

  // genres
  const genres = post['Жанр']?.querySelector('td:nth-child(2)')?.textContent?.split(',').map(trim) || []

  // dubs
  const dubs = post['В переводе']?.querySelector('td:nth-child(2)')?.textContent?.split(/\, |\sи\s/).map(trim) || []

  // duration in min
  const durationStr = post['Время']?.querySelector('td:nth-child(2)')?.textContent || ''
  const duration = parseInt(durationStr.split(' ', 1).join(''), 10) || null

  const directors = Array.from(
    post['Режиссер']?.querySelectorAll('td:nth-child(2) a') || [],
    (el) => ({
      name: el?.textContent,
      href: el?.getAttribute('href')!,
      poster: el.parentElement?.getAttribute('data-photo') === 'null'
        ? null
        : el.parentElement?.getAttribute('data-photo')!,
    }),
  )

  const persons = Array.from(
    post['В ролях актеры']?.querySelectorAll('a') || [],
    (el) => ({
      name: el?.textContent,
      href: el?.getAttribute('href')!,
      poster: el.parentElement?.getAttribute('data-photo') === 'null'
        ? null
        : el.parentElement?.getAttribute('data-photo')!,
    }),
  )

  const rating = post['Возраст']?.querySelector('span')?.textContent || null

  // collections
  const collections = Array.from(
    post['Из серии']?.querySelectorAll('td:nth-child(2) a') || [],
    (el) => ({
      name: el.textContent,
      href: el.getAttribute('href')!,
    }),
  )

  // description
  const description = contentMain?.querySelector('.b-post__description_text')?.textContent?.trim() || null

  // related content
  const related = Array.from(
    contentMain?.querySelectorAll('.b-post__partcontent_item:not(.current)') || [],
    (e) => ({
      name: e.querySelector('.title')?.textContent!,
      href: e.getAttribute('data-url')!,
      year: Number(e.querySelector('.year')?.textContent.split(' ', 2).at(0)) || null,
      rating: Number(e.querySelector('.rating')?.textContent) || null,
    }),
  )

  // episodes
  const episodes = Array.from(
    contentMain?.querySelectorAll('.b-post__schedule .b-post__schedule_table tbody tr') || [],
    (e) => {
      const textContent = e.querySelector('.td-1')?.textContent || ''
      const parts = textContent.split(' ', 4)
      const titles = [
        e.querySelector('.td-2 b')?.textContent,
        e.querySelector('.td-2 span')?.textContent,
      ].filter(Boolean).map((v) => ({
        name: v!,
        lang: detectLanguage(v!).lang,
      }))
      const airDate = e.querySelector('.td-4')?.textContent

      return {
        season: parts[0] ? parseInt(parts[0]) : 0,
        episode: parts[2] ? parseInt(parts[2]) : 0,
        titles,
        airDate: parseDateString(airDate),
      }
    },
  ).filter((v) => v.season && v.episode)

  return {
    titles,
    poster,
    status,
    ratings,
    releaseDate,
    countries,
    genres,
    duration,
    rating,
    slogan,
    dubs,
    description,
    lists,
    collections,
    directors,
    persons,
    related,
    get episodes() {
      return episodes
    },
  } as const
}
