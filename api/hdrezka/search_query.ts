import {DOMParser} from 'jsr:@b-fuze/deno-dom'
import {CustomFetch} from '../../web/types.ts'
import {GetURI, getURI, ua} from './_utils.ts'

export type SearchQueryOptions = CustomFetch & {
  headers?: HeadersInit
}

export const searchQuery = async (query: string, options?: SearchQueryOptions & GetURI) => {
  const uri = getURI('/engine/ajax/search.php', options)
  const body = new FormData()
  body.set('q', query)

  try {
    const _fetch = options?.fetch ?? fetch
    const response = await _fetch(uri, {
      method: 'POST',
      body,
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

    return Array.from(doc.querySelectorAll('li'), (e) => {
      const title = e.querySelector('.enty')
      const titleOrig = title?.nextSibling?.textContent.trim()
      return {
        title: title?.textContent,
        titleOrig,
        href: e.querySelector('a')?.getAttribute('href'),
      }
    })
  } catch (error) {
    console.error('Error parsing page:', error)
    throw error
  }
}
