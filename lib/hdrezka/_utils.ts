import {URLPatternTyped} from '../../web/url-pattern.ts'

export const patternContentPage = new URLPatternTyped({
  pathname: '/:type/:genre/:id(\\d+)-{:title}-{:year(\\d+)}{-:latest}?.html',
})

export const origin = new Set([
  'https://hdrezka.me',
  'https://hdrezka.ag',
])

export const ua =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0'

export type GetURI = {
  /**
   * - hdrezka.me
   * - hdrezka.ag
   * @default 'hdrezka.me'
   */
  host?: string
  skipOriginCheck?: boolean
}

export const getURI = (path: string, options?: GetURI) => {
  const uri = new URL(path, 'https://hdrezka.me')
  if (options?.host) {
    uri.host = options?.host
    if (!options.skipOriginCheck && origin.has(options.host)) {
      throw new Error('Invalid URI Origin', {cause: `URI ${uri.toString()}`})
    }
  }

  return uri
}

/** parse: '15 января 2024' */
export const parseDateString = (dateString?: string): Date | null => {
  if (!dateString) return null
  // Регулярное выражение для извлечения дня, месяца и года
  const regex = /(\d{1,2})\s+([а-яА-Я]+)\s+(\d{4})/
  const match = dateString.match(regex)

  if (match) {
    const day = parseInt(match[1], 10)
    const month = match[2]
    const year = parseInt(match[3], 10)

    // Массив для соответствия месяцев
    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ]

    const monthIndex = months.indexOf(month.toLowerCase())

    if (monthIndex !== -1) {
      const date = new Date(year, monthIndex, day)
      return date
    }
  }

  return null
}

const parseURI = async () => {}
