import { parseBasicAuth } from '../helper.ts'

const authorize = (req: Request) => {}

const token = async (req: Request, oauth2Service: OAuth2Service) => {
  const body = Object.fromEntries(await req.formData()) as Record<string, string>

  const {
    username: client_id,
    password: client_secret,
  } = parseBasicAuth(req.headers.get('Authorization')) ?? {}

  const {grantType, token} = await oauth2Service.token({
    ...body,
    ...(client_id && {client_id}),
    ...(client_secret && {client_secret}),
  })
}
