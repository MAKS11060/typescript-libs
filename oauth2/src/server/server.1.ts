import { OAuth2TokenResponse } from '@maks11060/oauth2'

type GetStorageData<T> = T extends {storage: {create(data: OAuth2StorageData<infer O>): any}} ? O : never
type GetGrant<T, G extends string> = T extends {grants: { [K in G]: (...args: any[]) => infer O }} ? ExtractPromise<O>
  : never

type ExtractPromise<T> = T extends Promise<infer O> ? O : T

//
export interface OAuth2AppConfig {
  type?: 'confidential' | 'public'
  appName: string
  clientId: string
  clientSecret: string
  redirectUri: string[]
}

// token()
export type OAuth2GrantTypeAuthorizationCode = {
  grant_type: 'authorization_code'
  code: string
  client_id: string
  client_secret: string
  redirect_uri?: string
  code_verifier?: string
  state?: string
}
export type OAuth2GrantTypeRefresh = {
  grant_type: 'refresh_token'
  client_id: string
  refresh_token: string
}
export type OAuth2GrantTypeCredentials = {
  grant_type: 'client_credentials'
  client_id: string
  client_secret: string
}
export type OAuth2GrantTypePassword = {
  grant_type: 'password'
  client_id: string
  client_secret: string
  username: string
  password: string
}
export type OAuth2GrantType =
  | OAuth2GrantTypeAuthorizationCode
  | OAuth2GrantTypeRefresh
  | OAuth2GrantTypeCredentials
  | OAuth2GrantTypePassword

interface OAuth2ServerOptions<T> {
  storage: OAuth2Storage<T>
  grants: {
    authorizationCode?(data: {store: OAuth2StorageData<T>}): void
  }
}

interface OAuth2ServerApp<Ctx> {
  authorize(uri: URL, ctx?: Ctx): Promise<
    | {responseType: 'code'; authorizeUri: URL}
    | {responseType: 'token'; authorizeUri: URL}
  >

  token(data: OAuth2GrantTypeAuthorizationCode): Promise<OAuth2TokenResponse<GetGrant<T, 'authorizationCode'>>>
  token(data: OAuth2GrantTypeRefresh): Promise<OAuth2TokenResponse<GetGrant<T, 'refreshToken'>>>
  token(data: OAuth2GrantTypeCredentials): Promise<OAuth2TokenResponse<GetGrant<T, 'credentials'>>>
  token(data: OAuth2GrantTypePassword): Promise<OAuth2TokenResponse<GetGrant<T, 'password'>>>
}

interface DefaultCtx {
  /** `Subject` - any identification used to identify the user */
  sub: string
}

interface OAuth2StorageData<Ctx = DefaultCtx> {
  ctx?: Ctx
  code: string
}

interface OAuth2Storage<T> {
  set(data: OAuth2StorageData<T>): Promise<void> | void
  get(code: string): Promise<OAuth2StorageData<T> | undefined> | void
}

export const createOAuth2Server = <
  Ctx extends object = DefaultCtx,
  Options extends OAuth2ServerOptions<Ctx> = OAuth2ServerOptions<Ctx>,
>(options: Options): OAuth2ServerApp<Options> => ({} as any)

// createOAuth2Server<{sub: 'string'}>({
createOAuth2Server({
  storage: {
    set(data) {},
    async get(code) {},
  },
  grants: {
    authorizationCode(data) {
      data.store.ctx
    },
  },
})
