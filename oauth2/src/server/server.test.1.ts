import {oauth2Authorize, oauth2ExchangeCode} from '@maks11060/oauth2/authorization'
import {createOauth2Server, OAuth2StorageData} from './server.ts'
import {GrantType} from './helper.ts'
import {OAuth2ClientConfig} from '@maks11060/oauth2/client'

const redirectUri = 'http://localhost/oauth2/callback'
const store = new Map<string, OAuth2StorageData>()

const oauth2Server = createOauth2Server({
  getClient(clientId) {
    console.log(clientId)
    return {
      appName: 'app-1',
      clientId: 'id-1',
      clientSecret: 'sec-1',
      redirectUri: [redirectUri],
    }
  },

  storage: store,
  grants: {
    authorizationCode({client, store}) {
      return {
        x_ts: Date.now(),
        access_token: 'at1',
        token_type: 'Bearer',
        refresh_token: 'rt1',
      }
    },
  },
})

Deno.test('Test 213123', async (t) => {
  const config: OAuth2ClientConfig = {
    authorizeUri: 'https://auth.example.com/authorize',
    tokenUri: '',
    clientId: 'id-1',
  }
  const authUri = oauth2Authorize(config)
  const auth = await oauth2Server.authorize({
    uri: authUri,
    ctx: {sub: 'user-1'},
  })

  // console.log(authUri.toString())
  console.log(auth)

  await oauth2ExchangeCode(config, {})

  const res = await oauth2Server.token({
    grant_type: GrantType.AuthorizationCode,
    client_id: 'id-1',
    code: '',
  })
  console.log(res)
})
