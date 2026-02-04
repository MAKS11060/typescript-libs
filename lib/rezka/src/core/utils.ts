import type {Type} from './constants.ts'

/**
 * @param dateString - '11 января 2011'
 */
export const parseDateString = (dateString?: string): Date | null => {
  if (!dateString) return null

  const regex = /(\d{1,2})\s+([а-яА-Я]+)\s+(\d{4})/ // day month year
  // const regex = /^(\d{1,2})\s+([а-яА-Я]+)\s+(\d{4})$/
  const match = dateString.trim().match(regex)

  if (match) {
    const day = parseInt(match[1], 10)
    const month = match[2]
    const year = parseInt(match[3], 10)

    // deno-fmt-ignore
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ]

    const monthIndex = months.indexOf(month.toLowerCase())
    if (monthIndex !== -1) {
      const date = new Date(year, monthIndex, day)

      if (
        date.getDate() === day &&
        date.getMonth() === monthIndex &&
        date.getFullYear() === year
      ) {
        return date
      }
    }
  }

  return null
}

const LANGUAGE_PATTERNS = {
  en: /[a-zA-Z]/gu,
  ru: /[а-яА-ЯёЁ]/gu,
  // zh: /\p{Script=Han}/gu,
  // ja: /[\p{Script=Hiragana}\p{Script=Katakana}]/gu,
  // ko: /\p{Script=Hangul}/gu,
  // ar: /\p{Script=Arabic}/gu,
  // hi: /\p{Script=Devanagari}/gu,
  // de: /[äöüßÄÖÜ]/gu,
} as const

export const detectLanguage = (text: string) => {
  const scores: Record<string, number> = {}
  let totalLetterCount = 0

  for (const lang in LANGUAGE_PATTERNS) {
    const matches = text.match(LANGUAGE_PATTERNS[lang as keyof typeof LANGUAGE_PATTERNS]) || []
    scores[lang] = matches.length
    totalLetterCount += matches.length
  }

  if (totalLetterCount === 0) {
    return {
      lang: null,
      score: 0,
      get scores() {
        return scores
      },
    }
  }

  let bestLang: string | null = null
  let maxCount = 0

  for (const [lang, count] of Object.entries(scores)) {
    if (count > maxCount) {
      maxCount = count
      bestLang = lang
    } else if (count === maxCount && count > 0) {
      bestLang = null
    }
  }

  return {
    lang: bestLang as keyof typeof LANGUAGE_PATTERNS | null,
    score: Number((maxCount / totalLetterCount).toFixed(2)),
    get scores() {
      return scores
    },
  }
}

export const parseUri = (href: string | URL) => {
  // TODO: replace to URLPattern
  // const patternContentPage = new URLPatternTyped({pathname: '/:type/:genre/:id(\\d+)-{:title}-{:year(\\d+)}{-:latest}?.html'})

  const removeHtml = (v: string) => v.endsWith('.html') ? v.slice(0, -5) : v
  const removeLatest = (v: string) => v.endsWith('-latest') ? v.slice(0, -7) : v

  const uriFrags = href.toString().split('/')
  // console.log(uriFrags.length, uriFrags)
  if (uriFrags.length === 6) { // 'https://hdrezka.me/cartoons/comedy/1760-yuzhny-park-1997-latest.html'
    const [, , hostname, type, genre, title] = uriFrags
    const id = title.split('-')[0]

    return {
      hostname,
      type: type as Type,
      genre,
      title: removeLatest(removeHtml(title)),
      id,
    }
  }

  // 'https://hdrezka.me/cartoons/comedy/1760-yuzhny-park-1997-latest/111-hdrezka-studio/27-season/3-episode.html'
  const [, , hostname, type, genre, title, dub, season, episode] = uriFrags
  const id = title.split('-')[0]

  return {
    hostname,
    type: type as Type,
    genre,
    title: removeLatest(title),
    id,
    dub,
    season,
    episode: removeHtml(episode),
  }
}

export const formatUri = ({hostname, type, genre, title}: {
  hostname: string
  type: string
  genre: string
  title: string
}) => {
  return `https://` + [
    hostname,
    type,
    genre,
    title + '-latest.html',
  ].join('/')
}
