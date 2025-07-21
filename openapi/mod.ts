/**
 * # OpenAPI 3 Builder
 *
 * ### TODO:
 * - Write doc
 * - Add support: webhooks, callbacks, links
 *
 * @example Create Doc
 * ```ts
 * import { createDoc } from '@maks11060/openapi'
 * import { zodPlugin } from '@maks11060/openapi/zod'
 * import { z } from 'zod'
 *
 * const doc = createDoc({
 *   plugins: {schema: [zodPlugin()]},
 *   info: {title: 'Test', version: '1.0.0'},
 * })
 *
 * console.log(doc.toDoc())      // get schema object
 * console.log(doc.toJSON(true)) // output in json format
 * console.log(doc.toYAML())     // output in yaml format
 * ```
 *
 * @example Usage
 * ```ts
 * import { createDoc } from '@maks11060/openapi'
 * import { zodPlugin } from '@maks11060/openapi/zod'
 * import { z } from 'zod/v4'
 *
 * const doc = createDoc({
 *   plugins: {schema: [zodPlugin()]},
 *   info: {title: 'Test', version: '1.0.0'},
 *   tags: [{name: 'users'}],
 * })
 *
 * doc.server({url: 'https://example.com'})
 *
 * const oauth2 = doc.addSecuritySchema.oauth2('OAuth2', {
 *   authorizationCode: {
 *     authorizationUrl: 'https://example.com/authorize',
 *     tokenUrl: 'https://example.com/api/token',
 *     scopes: {
 *       read: '',
 *       edit: '',
 *     },
 *   },
 * })
 *
 * const unauthorizedResponse = doc.addResponse('Unauthorized', (t) => {
 *   t.content('application/json', {}) //
 *     .example('Example', (t) => t.value({error: 'Unauthorized'}))
 * })
 *
 * const user = z.object({
 *   id: z.string(),
 *   username: z.string(),
 * })
 *
 * doc
 *   .addPath('/user') //
 *   .get((t) => {
 *     t.tag('users')
 *     t.summary('Get the authenticated user')
 *     t.security(oauth2, ['read'])
 *
 *     t.response(200, (t) => {
 *       t.content('application/json', user) //
 *         .example('User', (t) => t.value({id: '1', username: 'user1'}))
 *     })
 *     t.response(401, unauthorizedResponse)
 *   })
 *   .patch((t) => {
 *     t.tag('users')
 *     t.describe('Update user')
 *     t.security(oauth2, ['edit'])
 *
 *     t.response(200, (t) => {
 *       t.content('application/json', user) //
 *         .example('User', (t) => t.value({id: '1', username: 'user1'}))
 *     })
 *     t.response(401, unauthorizedResponse)
 *   })
 * ```
 *
 * @module
 */

export { createDoc, getInternal, getOperationIds, getPaths } from './src/openapi.ts'
export { type OpenAPI, type OpenAPIConfig, type SchemaPlugin } from './src/types.ts'
