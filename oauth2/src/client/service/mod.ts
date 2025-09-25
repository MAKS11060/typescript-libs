import { createGithubOauth2 } from '@maks11060/oauth2/providers'
import { OAuth2ClientConfig } from '../types.ts'

interface ClientService {}

type ServiceOptions<
  Props extends object,
  T extends PropertyKey,
> = {
  [K in T]:
    | OAuth2ClientConfig
    | ((data: {name: K} & Props) => OAuth2ClientConfig)
}

const createClientService = <
  Props extends object = {},
  T extends PropertyKey = string,
>(service: ServiceOptions<Props, T>): any => {
  service
}

createClientService({
  github1: createGithubOauth2({clientId: ''}),
  github2: (data) => {
    data.name satisfies 'github2'
    return createGithubOauth2({clientId: ''})
  },
})

interface DefaultStore {
  state: string
}

const createClientService2 = <
  T extends DefaultStore = DefaultStore,

  Props extends object = {},
  S extends PropertyKey = string,
>(options: {
  store: {
    get(key: string): Promise<T> | T | unknown
    set(key: string, value: T): Promise<void> | void | unknown
    delete?(key: string): Promise<void> | void | unknown
  },
  service: ServiceOptions<Props, S>
}) => {
  options
}

createClientService2({
  store: new Map(),
  service: {
    git: createGithubOauth2({clientId: ''})
  }
})
