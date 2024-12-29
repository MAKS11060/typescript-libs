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
