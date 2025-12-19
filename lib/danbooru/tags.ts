const maxTags = {
  Member: 2,
  Gold: 6,
  Platinum: Infinity,
}

const freeTags = new Set([
  'rating',
  'status',
  'is',
  'age',
  'date',
  'id',
  'limit',
  'score',
  'downvotes',
  'favcount',
  'width',
  'height',
  'ratio',
  'mpixels',
  'filesize',
  'filetype',
  'duration',
  'md5',
  'pixiv_id',
  'pixiv',
  'parent',
  'child',
  'upvote',
  'embedded',
  'tagcount',
])

/**
 * Builder for Danbooru tags.
 *
 * @returns The builder object with methods to add tags.
 * @see {@link https://danbooru.donmai.us/wiki_pages/help:cheatsheet}
 *
 * @example
 * const tags = danbooruTagsBuilder() //
 *   .rating(['g', 's'])
 *   .age('<7d')
 *   .tag('cat')
 *   .toString()
 * console.log(tags)
 */
export const danbooruTagsBuilder = (userLevel: keyof typeof maxTags = 'Member') => {
  const tags: string[] = []

  let tagCount = 0

  const checkLimits = () => {
    if (tagCount > maxTags[userLevel]) {
      throw new Error(`Exceeded tag limit for ${userLevel} users`)
    }
  }

  const toString = () => {
    return tags.join(' ')
  }

  const toURI = () => {
    return encodeURIComponent(tags.join(' '))
  }

  /**
   * Adds a tag to the query.
   * @param tag The tag to add.
   * @param exclude Whether to exclude the tag.
   * @returns The builder object.
   * @example
   * builder.tag('cat')
   * builder.tag('dog', true) // Exclude posts with the 'dog' tag
   */
  const tag = (tag: string, exclude: boolean = false) => {
    if (!freeTags.has(tag) || !freeTags.has(tag.split(':', 2)[1] /* rating:e */)) {
      tagCount++
    }
    tags.push((exclude ? '-' : '') + tag)
    checkLimits()
    return self
  }

  /**
   * Adds a rating tag to the query.
   * @param rating The ratings to add.
   * @param exclude Whether to exclude the ratings.
   * @returns The builder object.
   * @example
   * builder.rating(['g', 's'])
   * builder.rating(['q'], true) // Exclude posts with the 'q' rating
   */
  const rating = (rating: ('g' | 'q' | 's' | 'e')[], exclude: boolean = false) => {
    if (rating.length < 1) {
      throw new Error('at least one option must be specified')
    }

    tags.push((exclude ? '-' : '') + 'rating:' + [...new Set<string>(rating)].join(','))
    return self
  }

  /**
   * Adds an ID range tag to the query.
   * @param range The ID range to add.
   * @param excludeWhether to exclude the ID range.
   * @returns The builder object.
   * @example
   * builder.idRange(1000)
   * builder.idRange('1000..')
   * builder.idRange('>1000')
   * builder.idRange('..1000')
   * builder.idRange('<1000')
   * builder.idRange('1000..2000')
   * builder.idRange('1000...2000')
   * builder.idRange([1000, 2000, 3000])
   */
  const idRange = (range: string | number | (string | number)[], exclude: boolean = false) => {
    if (Array.isArray(range)) {
      tags.push((exclude ? '-' : '') + 'id:' + range.join(','))
    } else {
      tags.push((exclude ? '-' : '') + 'id:' + range)
    }
    return self
  }

  /**
   * Adds a date tag to the query.
   * @param date The date to add.
   * @param exclude Whether to exclude the date.
   * @returns The builder object.
   * @example
   * builder.date('2007-01-01')
   */
  const date = (date: string, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'date:' + date)
    return self
  }

  /**
   * Adds an age range tag to the query.
   * @param age The age range to add.
   * @param exclude Whether to exclude the age range.
   * @returns The builder object.
   * @example
   * builder.age('2w..1y')
   * builder.age('2weeks..1year')
   * builder.age('2d..1mo')
   * builder.age('2h..1d')
   * builder.age('2mi..1h')
   * builder.age('2s..1mi')
   */
  const age = (age: string | number, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'age:' + age)
    return self
  }

  /**
   * Adds a user tag to the query.
   * @param username The username to add.
   * @param exclude Whether to exclude the user.
   * @returns The builder object.
   * @example
   * builder.user('albert')
   * builder.user('albert', true) // Exclude posts uploaded by the user albert
   */
  const user = (username: string, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'user:' + username)
    return self
  }

  /**
   * Adds a favorite tag to the query.
   * @param username The username to add.
   * @param exclude Whether to exclude the favorite.
   * @returns The builder object.
   * @example
   * builder.fav('albert')
   * builder.fav('albert', true) // Exclude posts favorited by the user albert
   */
  const fav = (username: string, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'fav:' + username)
    return self
  }

  /**
   * Adds an ordered favorite tag to the query.
   * @param username The username to add.
   * @returns The builder object.
   * @example
   * builder.ordfav('albert')
   */
  const ordfav = (username: string) => {
    tags.push('ordfav:' + username)
    return self
  }

  /**
   * Adds a favorite count tag to the query.
   * @param count The favorite count to add.
   * @param exclude Whether to exclude the favorite count.
   * @returns The builder object.
   * @example
   * builder.favcount('>10')
   */
  const favcount = (count: string | number, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'favcount:' + count)
    return self
  }

  /**
   * Adds a score tag to the query.
   * @param score The score to add.
   * @param exclude Whether to exclude the score.
   * @returns The builder object.
   * @example
   * builder.score('100')
   */
  const score = (score: string | number, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'score:' + score)
    return self
  }

  /**
   * Adds a downvotes tag to the query.
   * @param count The downvotes count to add.
   * @param exclude Whether to exclude the downvotes count.
   * @returns The builder object.
   * @example
   * builder.downvotes('>10')
   */
  const downvotes = (count: string | number, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'downvotes:' + count)
    return self
  }

  /**
   * Adds an upvotes tag to the query.
   * @param count The upvotes count to add.
   * @param exclude Whether to exclude the upvotes count.
   * @returns The builder object.
   * @example
   * builder.upvotes('>10')
   */
  const upvotes = (count: string | number, exclude: boolean = false) => {
    tags.push((exclude ? '-' : '') + 'upvotes:' + count)
    return self
  }

  type Order = 'id' | 'id_asc' | 'id_desc' | 'favcount' | 'score' | 'score_asc' | 'rank' | 'downvotes' | 'upvotes'

  /**
   * Sets the order of the search results.
   * @param order The order to set.
   * @returns The builder object.
   * @example
   * builder.order('id')
   * builder.order('id_asc')
   * builder.order('id_desc')
   * builder.order('favcount')
   * builder.order('score')
   * builder.order('score_asc')
   * builder.order('rank')
   * builder.order('downvotes')
   * builder.order('upvotes')
   */
  const order = (order: Order) => {
    tags.push('order:' + order)
    return self
  }

  const self = {
    toString,
    toURI,
    tag,
    rating,
    idRange,
    date,
    age,
    user,
    fav,
    ordfav,
    favcount,
    score,
    downvotes,
    upvotes,
    order,
  }

  return self
}

/*
class TagBuilder {
  #tags: string[] = []

  constructor(readonly tagsLimit: number = 2) {}

  #checkLimit() {
    if (this.#tags.length > this.tagsLimit) {
      throw new Error(`Exceeded tag limit for users`)
      // throw new Error(`Exceeded tag limit for ${userLevel} users`)
    }
  }
}
*/
