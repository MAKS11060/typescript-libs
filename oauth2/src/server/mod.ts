/**
 * The module re-exports functions designed to work on the server side
 *
 * @module server
 */

export { generateToken, parseBasicAuth } from './helper.ts'
export {
  createOauth2Server,
  type DefaultCtx,
  type OAuth2Client,
  type OAuth2Storage,
  type OAuth2StorageData,
} from './server.ts'
