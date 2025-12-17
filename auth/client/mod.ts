import {BroadcastChannelTyped} from './lib/typedBroadcastChannel.ts'
import {decodeJwt} from 'npm:jose'

interface AuthOptions {}

interface TokenResponse {
  access: string
}
export type TokenPayload = {
  sub: string
  exp: number
  iat: number
}

type AuthTabEvents =
  | {type: 'req_token'}
  | {type: 'res_token'; token: TokenResponse}
  | {type: 'set_token'; token: TokenResponse | null}

export const initAuthService = (options: AuthOptions) => {
  let token: TokenResponse | null = null

  const session = initSessionStore('auth')
  const bc = new BroadcastChannelTyped<AuthTabEvents>('auth')

  /* {
    const setToken = (token: Token, share = false) => {
      const currentToken = getToken()
      if (currentToken === token) return
      if (currentToken && token && !checkTokenIsExpires(token)) {
        const curToken = decodeJwt<TokenPayload>(currentToken)
        const newToken = decodeJwt<TokenPayload>(token)
        if (curToken.iat > newToken.iat) return
      }

      tokenStore.set(token) // set new
      share && bc.postMessage({type: 'set_token', token})
    }

    } */
  const checkTokenIsExpires = (token: TokenResponse) => {
    const tolerance = 50
    // const tolerance = 3580
    const now = Math.floor(Date.now() / 1000)
    const {exp} = decodeJwt<TokenPayload>(token.access!)
    return now > exp - tolerance
  }

  const set = (t: TokenResponse | null, share = false): boolean => {
    // check is expired
    // check is new token

    if (token === t) return true
    if (token && t && !checkTokenIsExpires(t)) {
      const curToken = decodeJwt<TokenPayload>(token.access)
      const newToken = decodeJwt<TokenPayload>(t.access)
      if (curToken.iat > newToken.iat) {
      }
      // token = curToken.iat > newToken.iat ? token : t
    }

    token = t
    share && bc.postMessage({type: 'set_token', token})
    return true
  }

  bc.addEventListener('message', (e) => {
    const data = e.data
    switch (data.type) {
      case 'req_token':
        if (token) bc.postMessage({type: 'res_token', token})
        break
      case 'res_token':
        set(data.token)
        break
      case 'set_token':
        token = data.token
        break
    }
  })

  return {
    // get status(): 'authorized' | 'unauthorized' {
    //   return token === null ? 'unauthorized' : 'authorized'
    // },

    async getToken() {
      // 1 get from session store (save between reloads)
      // 2 get from another tabs
      // 3 try fetch with lock

      // 1
      if (session && set(session.get())) return token

      // 2
    },
  }
}

const fetchToken = async () => {
  const res = await fetch('/api/token', {method: 'GET'})
  const data = await res.json() as TokenResponse
  return data
}

const initSessionStore = (key: string) => {
  if (!sessionStorage) return

  return {
    set(token: TokenResponse | null) {
      token //
        ? sessionStorage.setItem(key, JSON.stringify(token))
        : sessionStorage.removeItem(key)
    },
    get(): TokenResponse | null {
      return JSON.parse(sessionStorage.getItem(key) || 'null')
    },
  }
}

const initBroadcastChannel = async () => {
  const bc = new BroadcastChannelTyped<AuthTabEvents>('auth')

  bc.addEventListener('message', (e) => {
    const data = e.data

    switch (data.type) {
      case 'req_token':
        // bc.postMessage({type: 'res_token', token})
      case 'res_token':
      case 'set_token':
    }
  })
}

const acquireTokenViaLock = async () => {
  if (!('locks' in navigator)) {
    console.error('Locks manager not available!!!')
    // TODO: fallback / dynamic import('npm:navigator.locks') // https://www.npmjs.com/package/navigator.locks
    return
  }

  await navigator.locks.request(
    LOCK_TOKEN_RESTORATION,
    {ifAvailable: true},
    async (lock) => {
      if (!lock) return
      // fetch token
      // set local

      // setToken(await apiGetToken(), true)
    },
  )
}

// TMP
const BC_NAME = '_token'
const LOCK_TOKEN_RESTORATION = 'auth-token-restoration'
const BC_REQUEST_TOKEN_TIMEOUT = 150 // ms / delay for receiving a token from another tab

Deno.test('Test 308346', async (t) => {
  let a = null

  a ??= 1

  console.log(a)
})
