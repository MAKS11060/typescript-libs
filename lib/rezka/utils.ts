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
      type,
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
    type,
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
