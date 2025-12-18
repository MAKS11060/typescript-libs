import {DOMParser} from '@b-fuze/deno-dom'
import {ORIGINS, userAgent} from './config.ts'
import {BaseOptions} from './types.ts'

export const querySearch = async (query: string, options?: BaseOptions) => {
  const pathname = '/engine/ajax/search.php'
  const uri = new URL(pathname, options?.origin ?? ORIGINS[1])
  const body = new FormData()
  body.set('q', query.trim())

  try {
    const _fetch = options?.fetch ?? fetch
    const headers = new Headers({
      'user-agent': options?.userAgent ?? userAgent,
      ...options?.headers,
    })
    const response = await _fetch(uri, {
      method: 'POST',
      headers,
      body,
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${uri}: ${response.statusText}`)
    }

    const html = await response.text()
    return parse(html)
  } catch (e) {
    console.error('Error parsing querySearch:', e)
  }

  return []
}

const parse = (html: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  return Array.from(doc.querySelectorAll('li'), (e) => {
    const title = e.querySelector('.enty')
    const titleOrig = title?.nextSibling?.textContent.trim()

    const rating = e.querySelector('.rating')
    const ratingTitle = rating?.querySelector('i')?.getAttribute('title')

    return {
      title: title?.textContent,
      titleOrig,
      href: e.querySelector('a')?.getAttribute('href'),
      rating: {
        type: /кинопоиск/i.test(ratingTitle || '') ? 'Кинопоиск' : null,
        score: parseFloat(rating?.textContent || '') || null,
        count: parseInt(/\d+/.exec(ratingTitle || '')?.[0] || '', 10) || null,
      },
    }
  })
}
