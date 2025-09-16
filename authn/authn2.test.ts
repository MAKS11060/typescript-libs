import {encodeBase64Url} from '@std/encoding/base64url'
import {expect} from 'jsr:@std/expect'
import {PubKeyCredParams} from './authn.ts'
import {credentials} from './authn2.ts'

Deno.test('credentials.create 1', async (t) => {
  const challenge = new Uint8Array([123])
  const options = credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'example',
        id: 'example.com',
      },
      user: {
        id: new Uint8Array([1, 2, 3, 4]),
        name: 'authn',
        displayName: 'Authn Test',
      },
      timeout: 60_000,
      authenticatorSelection: {
        userVerification: 'required',
      },
      pubKeyCredParams: PubKeyCredParams,
    },
  })

  expect(options.toJSON()).toEqual({
    challenge: 'ew',
    user: {id: 'AQIDBA', name: 'authn', displayName: 'Authn Test'},
    excludeCredentials: undefined,
    rp: {name: 'example', id: 'example.com'},
    timeout: 60000,
    authenticatorSelection: {userVerification: 'required'},
    pubKeyCredParams: [
      {type: 'public-key', alg: -8},
      {type: 'public-key', alg: -7},
      {type: 'public-key', alg: -257},
    ],
  })
})

Deno.test('credentials.create 2', async (t) => {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const cred = credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: '',
        id: '',
      },
      user: {
        id: new Uint8Array([1, 2, 3, 4]),
        name: '',
        displayName: '',
      },
      pubKeyCredParams: PubKeyCredParams,
      excludeCredentials: [{
        id: new Uint8Array([1, 2, 3, 4]),
        type: 'public-key',
        transports: ['internal'],
      }],
      timeout: 0,
      //
      attestation: 'direct',
      authenticatorSelection: {
        userVerification: 'required',
        authenticatorAttachment: 'cross-platform',
        requireResidentKey: true,
        residentKey: 'required',
      },
      extensions: {
        appid: '',
        credentialProtectionPolicy: '',
        enforceCredentialProtectionPolicy: true,
        credProps: true,
        hmacCreateSecret: true,
        largeBlob: {
          read: true,
          support: '',
          write: new Uint8Array(),
        },
        minPinLength: true,
      },
    },
  })

  expect(cred.toJSON()).toEqual({
    challenge: encodeBase64Url(challenge),
    user: {id: 'AQIDBA', name: '', displayName: ''},
    excludeCredentials: [{id: 'AQIDBA', type: 'public-key', transports: ['internal']}],
    rp: {name: '', id: ''},
    pubKeyCredParams: [
      {type: 'public-key', alg: -8},
      {type: 'public-key', alg: -7},
      {type: 'public-key', alg: -257},
    ],
    timeout: 0,
    attestation: 'direct',
    authenticatorSelection: {
      userVerification: 'required',
      authenticatorAttachment: 'cross-platform',
      requireResidentKey: true,
      residentKey: 'required',
    },
    extensions: {
      appid: '',
      credentialProtectionPolicy: '',
      enforceCredentialProtectionPolicy: true,
      credProps: true,
      hmacCreateSecret: true,
      largeBlob: {read: true, support: '', write: ''},
      minPinLength: true,
    },
  })
})

Deno.test('credentials.get', async (t) => {
  const challenge = new Uint8Array([111])
  const options = credentials.get({
    publicKey: {
      challenge,
      rpId: 'example.com',
      allowCredentials: [{
        id: new Uint8Array([1, 2, 3, 4]),
        transports: ['internal', 'hybrid'],
        type: 'public-key',
      }],
      userVerification: 'required',
      extensions: {
        appid: '',
        credentialProtectionPolicy: '',
        enforceCredentialProtectionPolicy: true,
        credProps: true,
        hmacCreateSecret: true,
        largeBlob: {
          read: true,
          support: 'required',
          write: new Uint8Array([1, 2, 3, 4]),
        },
        minPinLength: true,
      },
    },
  })

  // console.log(options.toJSON())
  expect(options.toJSON()).toEqual({
    challenge: 'bw',
    allowCredentials: [{
      id: 'AQIDBA',
      transports: ['internal', 'hybrid'],
      type: 'public-key',
    }],
    rpId: 'example.com',
    userVerification: 'required',
    extensions: {
      appid: '',
      credentialProtectionPolicy: '',
      enforceCredentialProtectionPolicy: true,
      credProps: true,
      hmacCreateSecret: true,
      minPinLength: true,
      largeBlob: {read: true, support: 'required', write: 'AQIDBA'},
    },
  })
})
