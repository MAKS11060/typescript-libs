const BASIC_AUTH = /^Basic\s(?<credentials>[A-Z0-9\+\/]*=?)$/i

export const basicAuth = (cred: {username: string; password: string}) => {
  return 'Basic ' + new TextEncoder().encode(`${cred.username}:${cred.password}`).toBase64()
}

export const getBasicAuth = (req: Request) => {
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization || !BASIC_AUTH.test(authorization)) return null

    const {credentials} = BASIC_AUTH.exec(authorization)?.groups as {credentials: string}
    const [username, password] = new TextDecoder()
      .decode(Uint8Array.fromBase64(credentials))
      .split(':', 2)

    return {username, password}
  } catch (e) {
    return null
  }
}
