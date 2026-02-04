export interface BaseOptions {
  fetch?: typeof fetch
  headers?: HeadersInit
  userAgent?: string

  /** @default 'https://hdrezka.me' */
  base?: string
}

export type AnyString = {} & string
// type Strict<T> = T extends string ? (string extends T ? never : T) : T

export type Type =
  | 'films'
  | 'series'
  | 'cartoons'
  | 'animation'
  | 'show'
  | 'games'

export type Genres = {
  films: GenresFilm | AnyString
  series: GenresSeries | AnyString
  cartoons: GenresCartoons | AnyString
  animation: GenresAnimation | AnyString
  show: string
  games: string
}

type GenresFilm =
  | 'action'
  | 'adventures'
  | 'arthouse'
  | 'biographical'
  | 'cognitive'
  | 'comedy'
  | 'concert'
  | 'crime'
  | 'detective'
  | 'documentary'
  | 'drama'
  | 'erotic'
  | 'family'
  | 'fantasy'
  | 'fiction'
  | 'foreign'
  | 'historical'
  | 'horror'
  | 'kids'
  | 'melodrama'
  | 'military'
  | 'musical'
  | 'musical'
  | 'russian'
  | 'short'
  | 'sport'
  | 'standup'
  | 'theatre'
  | 'thriller'
  | 'travel'
  | 'ukrainian'
  | 'western'

type GenresSeries =
  | 'action'
  | 'adventures'
  | 'arthouse'
  | 'biographical'
  | 'comedy'
  | 'crime'
  | 'detective'
  | 'documentary'
  | 'drama'
  | 'erotic'
  | 'family'
  | 'fantasy'
  | 'fiction'
  | 'foreign'
  | 'historical'
  | 'horror'
  | 'melodrama'
  | 'military'
  | 'musical'
  | 'realtv'
  | 'russian'
  | 'sport'
  | 'standup'
  | 'telecasts'
  | 'thriller'
  | 'ukrainian'
  | 'western'

type GenresCartoons =
  | 'action'
  | 'adult'
  | 'adventures'
  | 'anime'
  | 'arthouse'
  | 'biographical'
  | 'cognitive'
  | 'comedy'
  | 'crime'
  | 'detective'
  | 'documentary'
  | 'drama'
  | 'erotic'
  | 'fairytale'
  | 'family'
  | 'fantasy'
  | 'fiction'
  | 'foreign'
  | 'full-length'
  | 'historical'
  | 'horror'
  | 'kids'
  | 'melodrama'
  | 'military'
  | 'multseries'
  | 'musical'
  | 'russian'
  | 'short'
  | 'soyzmyltfilm'
  | 'sport'
  | 'thriller'
  | 'ukrainian'
  | 'western'

type GenresAnimation =
  | 'action'
  | 'adventures'
  | 'comedy'
  | 'detective'
  | 'drama'
  | 'ecchi'
  | 'educational'
  | 'erotic'
  | 'everyday'
  | 'fairytale'
  | 'fantasy'
  | 'fiction'
  | 'fighting'
  | 'historical'
  | 'horror'
  | 'kids'
  | 'kodomo'
  | 'mahoushoujo'
  | 'mecha'
  | 'military'
  | 'musical'
  | 'mystery'
  | 'parody'
  | 'romance'
  | 'samurai'
  | 'school'
  | 'shoujo'
  | 'shoujoai'
  | 'shounen'
  | 'shounenai'
  | 'sport'
  | 'thriller'

// deno-fmt-ignore
export const CatalogQueryType = {
  film:      1,
  series:    2,
  cartoons:  3,
  animation: 82,
} as const

// deno-fmt-ignore
export const genres = {
  'вестерны': 'western',
  'семейные': 'family',
  'фэнтези': 'fantasy',
  'биографические': 'biographical',
  'арт-хаус': 'arthouse',
  'боевики': 'action',
  'военные': 'military',
  'детективы': 'detective',
  'криминал': 'crime',
  'приключения': 'adventures',
  'драмы': 'drama',
  'спортивные': 'sport',
  'фантастика': 'fiction',
  'комедии': 'comedy',
  'мелодрамы': 'melodrama',
  'триллеры': 'thriller',
  'ужасы': 'horror',
  'музыкальные': 'musical',
  'исторические': 'historical',
  'документальные': 'documentary',
  'эротика': 'erotic',
  'детские': 'kids',
  'путешествия': 'travel',
  'познавательные': 'cognitive',
  'театр': 'theatre',
  'концерт': 'concert',
  'стендап': 'standup',
  'короткометражные': 'short',
  'русские': 'russian',
  'украинские': 'ukrainian',
  'зарубежные': 'foreign',
  'реальное тв': 'realtv',
  'телепередачи': 'telecasts',
  'сказки': 'fairytale',
  'мюзиклы': 'musical',
  'аниме': 'anime',
  'для взрослых': 'adult',
  'мультсериалы': 'multseries',
  'полнометражные': 'full-length',
  'советские': 'soyzmyltfilm',
  'романтические': 'romance',
  'мистические': 'mystery',
  'боевые искусства': 'fighting',
  'самурайский боевик': 'samurai',
  'образовательные': 'educational',
  'повседневность': 'everyday',
  'пародия': 'parody',
  'школа': 'school',
  'кодомо': 'kodomo',
  'сёдзё-ай': 'shoujoai',
  'сёдзё': 'shoujo',
  'сёнэн': 'shounen',
  'сёнэн-ай': 'shounenai',
  'этти': 'ecchi',
  'махо-сёдзё': 'mahoushoujo',
  'меха': 'mecha',
}
