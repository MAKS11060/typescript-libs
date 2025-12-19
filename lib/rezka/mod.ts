/*
  mod.ts
  - page.ts
  - search.ts
  - querySearch.ts
*/

import * as page from './page.ts'
import * as querySearch from './query-search.ts'
import * as search from './search.ts'
import {formatUri, parseUri} from './utils.ts'

export * as config from './config.ts'
export const Rezka = {
  page: page.resolve,
  search: search.search,
  querySearch: querySearch.querySearch,
  parseUri,
  formatUri,
} as const
