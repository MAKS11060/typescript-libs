import { OAuth2ClientConfig } from '../oauth2.ts'

export interface StateData {
  /** OAuth2 provider name */
  service: string
  /** Subject */
  sub?: string
}

/**
 * Storage for oauth `state`
 */
export interface OAuth2StateService<T = string> {
  generator?(): T | Promise<T>
  set(state: T, data: StateData): string | Promise<string>
  get(state: string): StateData | Promise<StateData>
}

/**
 * - create account
 * - bind account
 * - find saved
 * - update
 * - delete
 */
export interface OAuth2AccountService {}

////////////////////////////////////////////////////////////////
export type CreateOauth2ClientService = <T extends string, S>(config: {
  state: OAuth2StateService<S>
  clients: {
    [K in T]: OAuth2ClientConfig | ((service: K) => OAuth2ClientConfig)
  }
}) => Oauth2ClientService<T>

export interface Oauth2ClientService<T extends string> {
  has(service: unknown): service is T
  getClient(service: T): OAuth2ClientConfig
  authorize(service: T, options: OAuth2ServiceAuthorize): {}
  callback(options: OAuth2ServiceCallback): {}
}

export interface OAuth2ServiceAuthorize {
  /** Subject */
  sub?: string
}

export interface OAuth2ServiceCallback {
  state: string
  code: string
  codeVerifier?: string
}

//
