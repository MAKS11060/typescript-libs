import {DOMParser} from 'jsr:@b-fuze/deno-dom'
import {CustomFetch} from '../../web/types.ts'
import {GetURI, getURI, ua} from './_utils.ts'

const SearchGenre = {
  films: 1,
  series: 2,
  cartoons: 3,
  anime: 82,
}

type SearchFilter =
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

type SearchOptions = CustomFetch &
  SearchFilter & {
    /** @default 1 */
    page?: number
    headers?: HeadersInit
  }

export const search = async (options: SearchOptions & GetURI) => {
  const uri = getURI(`/${options.type}/page/${options.page ?? 1}/`, options)

  if (
    options.type === 'films' ||
    options.type === 'series' ||
    options.type === 'cartoons' ||
    options.type === 'anime'
  ) {
    if (options.filter) uri.searchParams.set('filter', options.filter)
  }
  if (options.type === 'new') {
    if (options.filter) uri.searchParams.set('filter', options.filter)
    if (options.genre) uri.searchParams.set('genre', `${SearchGenre[options.genre]}`)
  }

  try {
    const _fetch = options?.fetch ?? fetch
    const response = await _fetch(uri, {
      headers: new Headers({
        'user-agent': ua,
        ...options?.headers,
      }),
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${uri}: ${response.statusText}`)
    }

    const text = await response.text()
    const doc = new DOMParser().parseFromString(text, 'text/html')

    const itemsEl = doc.querySelector('.b-content__inline_items')
    const items = Array.from(itemsEl?.querySelectorAll('.b-content__inline_item') ?? [], (el) => {
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
    })

    return items
  } catch (error) {
    console.error('Error parsing page:', error)
    throw error
  }
}
