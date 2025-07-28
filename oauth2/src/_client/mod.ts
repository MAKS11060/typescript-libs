import { oauth2Authorize, oauth2ExchangeCode } from '@maks11060/oauth2/authorization'
import { OAuth2ClientConfig } from '../client/types.ts'
import { OAuth2StateStorage } from './state.ts'

export interface OAuth2ServiceAuthorize {
  /** Subject */
  sub?: string
}

export interface OAuth2ServiceCallback {
  state: string
  code: string
  codeVerifier?: string
}

export const oauth2Service = <T extends string = string, S = string>(config: {
  state: OAuth2StateStorage<S>
  clients: {
    [K in T]: OAuth2ClientConfig | ((service: K) => OAuth2ClientConfig)
  }
}) => {
  config.state.generator ??= () => crypto.randomUUID() as S

  return {
    has(service: unknown): service is T {
      return String(service) in config.clients
    },

    getClient(service: T): OAuth2ClientConfig {
      if (!this.has(service)) throw new Error('OAuth2 Service: unknown client')

      return typeof config.clients[service] === 'function' //
        ? config.clients[service](service)
        : config.clients[service]
    },

    async authorize(service: T, options: OAuth2ServiceAuthorize) {
      const cfg = this.getClient(service)

      const stateKey = await config.state.generator?.()!
      const state = await config.state.set(stateKey, {service})

      return oauth2Authorize(cfg, state)
    },

    async callback(options: OAuth2ServiceCallback) {
      const {service, ...data} = await config.state.get(options.state)
      if (!this.has(service)) throw new Error('OAuth2 Service: unknown client')

      const cfg = this.getClient(service)

      const token = await oauth2ExchangeCode(cfg, {code: options.code})
      return {service, token, ...data}
    },
  }
}
