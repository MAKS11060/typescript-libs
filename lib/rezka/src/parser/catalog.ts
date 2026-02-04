import {DOMParser, type HTMLDocument} from '@b-fuze/deno-dom'
import {config} from '../core/config.ts'
import {
  type CatalogAnimationGenres,
  type CatalogCartoonsGenres,
  type CatalogFilmGenres,
  CatalogQueryType,
  type CatalogSeriesGenres,
  CatalogType,
} from '../core/constants.ts'
import {RezkaFetchError} from '../core/errors.ts'
import type {BaseOptions} from '../types.ts'

type AnyString = {} & string
// type Strict<T> = T extends string ? (string extends T ? never : T) : T

type Genres = {
  movie: typeof CatalogFilmGenres[number]
  series: typeof CatalogSeriesGenres[number]
  cartoon: typeof CatalogCartoonsGenres[number]
  anime: typeof CatalogAnimationGenres[number]
}

export const catalog = {
  async get<Type extends keyof Genres>(
    type: Type,
    query?: BaseOptions & {
      filter?: 'last' | 'popular' | 'soon' | 'watching' | AnyString
      genre?: Genres[Type]
      page?: number
    },
  ) {
    const url = new URL(`/${CatalogType[type]}/`, config.base)

    if (query) {
      if (query.genre) url.pathname += `${query.genre}/`
      if (query.page && query.page > 1) url.pathname += `page/${query.page}/`
      if (query.filter) url.searchParams.set('filter', query.filter)
    }

    return await makeRequest(url, query)
  },

  async getBest<Type extends keyof Genres>(
    type: keyof typeof CatalogType,
    query?: BaseOptions & {
      genre?: Genres[Type]
      year?: number
      page?: number
    },
  ) {
    const url = new URL(`/${CatalogType[type]}/best/`, config.base)

    if (query) {
      if (query.genre) url.pathname += `${query.genre}/`
      if (query.year) url.pathname += `${query.year}/`
      if (query.page && query.page > 1) url.pathname += `page/${query.page}/`
    }

    return await makeRequest(url, query)
  },

  async getNew(
    query?: BaseOptions & {
      filter?: 'last' | 'popular' | 'watching' | AnyString
      genre?: keyof typeof CatalogQueryType
      page?: number
    },
  ) {
    const url = new URL(`/new/`, config.base)

    if (query) {
      if (query.page && query.page > 1) url.pathname += `page/${query.page}/`
      if (query.genre) url.searchParams.set('genre', String(CatalogQueryType[query.genre]))
    }

    return await makeRequest(url, query)
  },

  async getAnnounce(query?: BaseOptions & {page?: number}) {
    const url = new URL(`/announce/`, config.base)

    if (query?.page && query.page > 1) url.pathname += `page/${query.page}/`

    return await makeRequest(url, query)
  },
}

const makeRequest = async (url: string | URL, options?: BaseOptions) => {
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
    data,
  }
}

const parse = (doc: HTMLDocument) => {
  const itemsEl = doc.querySelector('.b-content__inline_items')
  const items = Array.from(
    itemsEl?.querySelectorAll('.b-content__inline_item') ?? [],
    (el) => {
      const id = el.getAttribute('data-id')
      const url = el.getAttribute('data-url')

      const img = el.querySelector('.b-content__inline_item-cover img')?.getAttribute('src') ?? null

      const title = el.querySelector('.b-content__inline_item-link a')?.textContent
      const linkText = el.querySelector('.b-content__inline_item-link div')?.textContent

      const [yearRange, ...tags] = linkText?.split(',').map((v) => v.trim()) ?? []
      const [yearStart, yearEnd = null] = yearRange.split('-').map((v) => (isNaN(parseInt(v)) ? null : parseInt(v)))

      return {
        id,
        title,
        tags,
        yearStart,
        yearEnd,
        img,
        url,
      }
    },
  )

  return items
}
