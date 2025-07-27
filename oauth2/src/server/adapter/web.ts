import { parseBasicAuth } from '../helper.ts'
import { OAuth2Server } from '../server.ts'

export const parseAuthorizationCodeUri = (uri: string | URL) => {
  uri = typeof uri === "string" ? new URL(uri) : uri

  const code = uri.searchParams.get('code')
  const state = uri.searchParams.get('state')

  return
}

export const tokenFromUri = (uri: string | URL) => {
  uri = typeof uri === "string" ? new URL(uri) : uri

  const code = uri.searchParams.get('code')
  const state = uri.searchParams.get('state')

  return
}

export const tokenFromRequestBody = async (req: Request, oauth2Service: OAuth2Server) => {
  const body = Object.fromEntries(await req.formData()) as Record<string, string>

  const {
    username: client_id,
    password: client_secret,
  } = parseBasicAuth(req.headers.get('Authorization')) ?? {}

  return await oauth2Service.token({
    ...body,
    ...(client_id && {client_id}),
    ...(client_secret && {client_secret}),
  } as any)
}
