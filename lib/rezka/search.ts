import {DOMParser} from '@b-fuze/deno-dom'
import {ORIGINS, userAgent} from './config.ts'
import {BaseOptions} from './types.ts'

const SearchGenre = {
  films: 1,
  series: 2,
  cartoons: 3,
  anime: 82,
} as const

type QueryFilter =
  & (
    | {
      type: 'films' | 'series' | 'cartoons' | 'anime'
      filter?: 'last' | 'popular' | 'soon' | 'watching'
    }
    | {
      type: 'new'
      filter?: 'last' | 'popular' | 'watching'
      genre?: keyof typeof SearchGenre //'1' | '2' | '3' | '82'
    }
    | {
      type: 'announce'
    }
  )
  & {
    /** @default 1 */
    page?: number
  }

export const search = async (query: QueryFilter, options?: BaseOptions) => {
  const pathname = `/${query.type}/page/${query.page ?? 1}/`
  const uri = new URL(pathname, options?.origin ?? ORIGINS[1])

  if (
    query.type === 'films' ||
    query.type === 'series' ||
    query.type === 'cartoons' ||
    query.type === 'anime'
  ) {
    if (query.filter) uri.searchParams.set('filter', query.filter)
  }
  if (query.type === 'new') {
    if (query.filter) uri.searchParams.set('filter', query.filter)
    if (query.genre) uri.searchParams.set('genre', `${SearchGenre[query.genre]}`)
  }

  try {
    const _fetch = options?.fetch ?? fetch
    const headers = new Headers({
      'user-agent': options?.userAgent ?? userAgent,
      ...options?.headers,
    })
    const response = await _fetch(uri, {headers})
    if (!response.ok) {
      throw new Error(`Failed to fetch ${uri}: ${response.statusText}`)
    }

    const html = await response.text()
    return parse(html)
  } catch (error) {
    console.error('Error parsing page:', error)
  }

  return null
}

export const parse = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')

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
