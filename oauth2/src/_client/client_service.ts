import {createDiscordOauth2, createGithubOauth2} from '@maks11060/oauth2/providers'
import {OAuth2ClientConfig} from '../client/types.ts'

interface ClientService {
  callback(): unknown
  authorize(): unknown
}

interface BaseCtx {}

type ClientConfig<T, Ctx> = {
  [K in keyof T]: OAuth2ClientConfig | ((ctx: {name: K} & Ctx) => OAuth2ClientConfig)
}

type Options<Client, Ctx> = {
  clients: ClientConfig<Client, Ctx>
}

type CreateClientService = <
  Client,
>(options: {
  clients: {
    [K in keyof Client]: OAuth2ClientConfig | ((ctx: {name: K}) => OAuth2ClientConfig)
  }
}) => ClientService

////////////////////////////////
const createOauth2ClientService: CreateClientService = () => ({} as any)
// const oauth2ClientService = createOauth2ClientService({
const oauth2ClientService = createOauth2ClientService({
  clients: {
    github: createGithubOauth2({clientId: ''}),
    discord: ({name}) => createDiscordOauth2({clientId: '', scope: ''}),
  },
})

oauth2ClientService.authorize()
oauth2ClientService.callback()

////////////////////////////////
// const test = <
//   O extends {
//     [K in keyof ]: (name: K) => void
//   },
// >(options: O) => {}

// test({
//   discord: (name) => {},
// })
