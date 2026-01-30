import {config, setConfig} from './core/config.ts'
import * as constants from './core/constants.ts'
import * as errors from './core/errors.ts'
import {formatUri, parseUri} from './core/utils.ts'
import {catalog} from './parser/catalog.ts'
import {getDetails} from './parser/datail.ts'
import {search} from './parser/search.ts'

export {catalog, constants, errors, getDetails, search, setConfig}

export const Rezka = {
  getDetails,
  catalog,
  search,
  errors,
  constants,
  setConfig,
  config,
  parseUri, // TODO: refactor
  formatUri, // TODO: refactor
}
