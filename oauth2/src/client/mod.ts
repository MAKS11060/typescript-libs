import { oauth2Authorize, oauth2ExchangeCode } from '@maks11060/oauth2/authorization'
import { OAuth2ClientConfig } from '../oauth2.ts'

export interface StateData {
  /** OAuth2 provider name */
  service: string
  /** Subject */
  sub?: string
}

/** Storage for oauth `state` */
export interface OAuth2StateStorage<T = string> {
  generator?(): T | Promise<T>
  set(state: T, data: StateData): string | Promise<string>
  get(state: string): StateData | Promise<StateData>
}

////////////////////////////////////////////////////////////////
export interface OAuth2ServiceAuthorize {
  /** Subject */
  sub?: string
}

export interface OAuth2ServiceCallback {
  state: string
  code: string
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
      const {service, ...data}: StateData = await config.state.get(options.state)
      if (!this.has(service)) throw new Error('OAuth2 Service: unknown client')

      const cfg = this.getClient(service)

      const token = await oauth2ExchangeCode(cfg, {code: options.code})
      return {service, token, ...data}
    },
  }
}

////////////////////////////////////////////////////////////////
export interface OAuth2AccountStorage<T = string> {
  set(state: T, data: StateData): unknown | Promise<unknown>
  get(state: string): unknown | Promise<unknown>
}
