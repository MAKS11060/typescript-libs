import {DOMParser, type HTMLDocument} from '@b-fuze/deno-dom'
import {config} from '../core/config.ts'
import type {BaseOptions} from '../core/constants.ts'
import {RezkaFetchError} from '../core/errors.ts'

export const search = async (query: string, options?: BaseOptions) => {
  const url = new URL('/engine/ajax/search.php', options?.base ?? config.base)
  const body = new FormData()
  body.set('q', query.trim())

  const _fetch = options?.fetch ?? config.fetch ?? fetch
  const headers = new Headers({
    'user-agent': options?.userAgent ?? config.userAgent!,
    ...config?.headers,
    ...options?.headers,
  })

  const response = await _fetch(url, {
    method: 'POST',
    headers,
    body,
  })
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
