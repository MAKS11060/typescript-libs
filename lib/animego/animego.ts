#!/usr/bin/env -S deno run -A --watch-hmr

import {DOMParser, Element} from '@b-fuze/deno-dom'
import {parseDateString} from './_utils.ts'

type FetchOptions = {
  fetch?: typeof fetch
  skipOriginCheck?: boolean
}

const origin = ['https://animego.me', 'https://animego.ong']

export const typeAlias = new Map<string, string>([
  ['тв сериал', 'tv'],
  ['фильм', 'movie'],
  ['спешл', 'special'],
  ['ova', 'ova'],
  ['ona', 'ona'],
])

export const statusAlias = new Map<string, string>([
  ['онгоинг', 'ongoing'],
  ['вышел', 'released'],
  ['анонс', 'anons'],
])

export type GetAnimeOptions = {
  sort?: string | 'a.createdAt' | 'a.startDate' | 'r.rating' | 'a.title'
  direction?: string | 'desc'
  view?: string | 'grid2' | 'grid' | 'list'
  page?: number
}

// anime list page: https://animego.org/anime
export const getAnime = async (page: number = 1, options?: FetchOptions) => {
  const uri = new URL('/anime', origin[0])
  const query: GetAnimeOptions = {
    sort: 'a.createdAt',
    direction: 'desc',
    view: 'grid',
    page: Math.min(1, page),
  }
  query.sort && uri.searchParams.set('sort', query.sort || 'a.createdAt')
  query.direction && uri.searchParams.set('direction', query.direction || 'desc')
  query.view && uri.searchParams.set('view', query.view || 'list')
  query.page && uri.searchParams.set('page', `${query.page}`)

  const customFetch = options?.fetch ?? fetch
  const res = await customFetch(uri, {headers: {'x-requested-with': 'XMLHttpRequest'}})
  if (!res.ok) throw new Error(`HTTP error ${res.status} ${res.statusText}`)

  const data = (await res.json()) as {
    status: 'success'
    content: string
  }
  if (data.status !== 'success') throw new Error('response status should be success')

  // parse content
  const doc = new DOMParser().parseFromString(data.content, 'text/html')
  const items = Array.from(doc.querySelectorAll('.animes-grid-item'), (e) => {
    const href = e.querySelector('a')?.getAttribute('href')
    const poster = e
      ?.querySelector('.animes-grid-item-picture')
      ?.querySelector('div[data-original]')
      ?.getAttribute('data-original')

    const title = e.querySelector('.animes-grid-item-body > div:nth-child(2)')?.textContent || null
    const titleOrig = e.querySelector('.animes-grid-item-body > div')?.textContent || null

    const [type, year] = Array.from(e.querySelectorAll('.animes-grid-item-body-info a'), (e) => e.textContent)

    return {
      title,
      titleOrig,
      type: typeAlias.get(type.toLowerCase()),
      year: parseInt(year),
      href,
      poster,
    }
  })

  return items
}

// anime info: https://animego.org/anime/title-name
export const getAnimePage = async (uri: string, options?: FetchOptions) => {
  const customFetch = options?.fetch ?? fetch
  const res = await customFetch(uri)
  const data = await res.text()

  // parse content
  const doc = new DOMParser().parseFromString(data, 'text/html')
  const media = doc.querySelector('.media')!

  // poster lg/md
  const img = media.querySelector('img')
  const posterMd = img?.getAttribute('src')
  const posterLg = img?.getAttribute('srcset')?.split(' ', 1)[0]

  const mediaBody = media.querySelector('.media-body')

  // score
  const ratingBlock = mediaBody?.querySelector('#itemRatingBlock')!
  const score = {
    animego: {
      score: parseFloat(ratingBlock?.querySelector('.rating-value')?.textContent?.split(',').join('.') || ''),
      count: parseInt(ratingBlock?.querySelector('.rating-count')?.textContent || '0'),
    },
  }

  // titles
  const titles = mediaBody?.querySelector('.anime-title')
  const title = titles?.querySelector('h1')?.textContent
  const titleList = Array.from(titles?.querySelectorAll('li')!, (e) => e.textContent)

  const animeInfo = mediaBody?.querySelector('.anime-info')

  // anime info
  const infoEntries = Array.from(animeInfo?.querySelectorAll('dt')!, (el) => [
    el.textContent.trim(),
    // el.nextSibling?.textContent.trim(),
    el.nextElementSibling,
  ])
  const post = Object.fromEntries(infoEntries) as Record<string, Element>

  // type
  const type = typeAlias.get(post['Тип'].textContent.trim().toLowerCase())

  // episodes
  const [ep_start, ep_end = null] = post['Эпизоды'].textContent
    .split('/')
    .join('')
    .split(' ')
    .filter((i) => i.trim())
    .map((i) => parseInt(i))

  // status
  const status = statusAlias.get(post['Статус']?.textContent.toLowerCase())

  // genres
  const genres = Array.from(post['Жанр'].querySelectorAll('a'), (e) => e.textContent)

  // studios
  const studios = post['Студия']?.textContent.split(',').map((v) => v.trim()) || []

  // dubs
  const dubs = post['Озвучка']?.textContent.split(',').map((v) => v.trim()) || []

  // release
  const releaseStr = post['Выпуск'].textContent
  const [release_start, release_end] = (
    releaseStr.startsWith('с') //
      ? releaseStr.substring(1)
      : releaseStr
  )
    .split('по', 2)
    .map((v) => parseDateString(v))

  // duration min
  const duration = parseInt(post['Длительность']?.textContent?.trim().split(' ', 1)[0])

  // Главные герои
  // console.log(Array.from(post['Главные герои']?.querySelectorAll('div > span:nth-child(1)'), e=> e.textContent.trim()))

  // console.log(post)
  return {
    title,
    titleList,
    type,
    score,
    status,
    genres,
    release: {start: release_start, end: release_end},
    studios,
    duration,
    episodes: {start: ep_start, end: ep_end},
    poster: {lg: posterLg, md: posterMd},
    dubs,
  }
}

// TODO: add 'type', 'year'
export const search = async (query: string, options?: FetchOptions) => {
  const uri = new URL('/search/all', origin[0])
  uri.searchParams.set('type', 'small')
  uri.searchParams.set('q', query)
  // uri.searchParams.set('_', Date.now().toString())

  const customFetch = options?.fetch ?? fetch
  const res = await customFetch(uri, {headers: {'x-requested-with': 'XMLHttpRequest'}})
  const data = (await res.json()) as {
    content: string
    status: 'success'
    word: string
  }
  // if (data.status !== 'success') throw new Error("")
  // console.log(data.content)

  const doc = new DOMParser().parseFromString(data.content, 'text/html')
  return Array.from(doc.querySelectorAll('.result-search-anime .result-search-item'), (e) => {
    const title = e.querySelector('a')?.textContent.trim()
    return {title}
  })
}
