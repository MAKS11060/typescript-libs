import { decodeBase64Url } from '@std/encoding/base64url'
import { expect } from 'jsr:@std/expect'
import {
  getPublicKey,
  isAssertion,
  isAttestation,
  PubKeyCredParams,
  publicKeyCreateOptionsToJSON,
  publicKeyCredentialFromJSON,
  publicKeyRequestOptionsToJSON,
  verifySignature,
} from './authn.ts'

Deno.test('publicKeyCreateOptionsToJSON()', async (t) => {
  const challenge = new Uint8Array([123])
  const options = publicKeyCreateOptionsToJSON({
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
  })

  expect(options).toEqual({
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

Deno.test('publicKeyRequestOptionsToJSON()', async (t) => {
  const challenge = new Uint8Array([111])
  const options = publicKeyRequestOptionsToJSON({
    challenge,
    rpId: 'example.com',
    allowCredentials: [
      {id: new Uint8Array([1, 2, 3, 4]), transports: ['internal', 'hybrid'], type: 'public-key'},
    ],
    userVerification: 'required',
  })

  expect(options).toEqual({
    challenge: 'bw',
    allowCredentials: [
      {id: 'AQIDBA', transports: ['internal', 'hybrid'], type: 'public-key'},
    ],
    rpId: 'example.com',
    userVerification: 'required',
  })
})

Deno.test('publicKeyCredentialFromJSON Attestation', async (t) => {
  const cred = publicKeyCredentialFromJSON({
    authenticatorAttachment: 'platform',
    clientExtensionResults: {},
    id: '931QGw1poO_Pr-aBvHhhyw',
    rawId: '931QGw1poO_Pr-aBvHhhyw',
    // deno-fmt-ignore
    response: {
      attestationObject: 'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YViU-Jx3W2CIjpKPnIQIsHlBYdSZfagIar-Fvq4jvuvvrDpdAAAAAOqbjWZNAR0hPOS2tIy1ddQAEPd9UBsNaaDvz6_mgbx4YculAQIDJiABIVggU-dlyytnRNS0bX0c9v8naV_6Lfb_Hf8ZfyaArlGTuociWCChDcCr8gGpFMdK8QDOmtIpY5Up6zFK5dG2q0fAg8jBNg',
      authenticatorData: '-Jx3W2CIjpKPnIQIsHlBYdSZfagIar-Fvq4jvuvvrDpdAAAAAOqbjWZNAR0hPOS2tIy1ddQAEPd9UBsNaaDvz6_mgbx4YculAQIDJiABIVggU-dlyytnRNS0bX0c9v8naV_6Lfb_Hf8ZfyaArlGTuociWCChDcCr8gGpFMdK8QDOmtIpY5Up6zFK5dG2q0fAg8jBNg',
      clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiYTBsa3RjQXMwY3NFNGVBaXV1ZWVIdDVWUlFMQ1RYQWpESmNYZ2xobzNJTSIsIm9yaWdpbiI6Imh0dHBzOi8vbWFrczExMDYwLmtlZW5ldGljLmxpbmsiLCJjcm9zc09yaWdpbiI6ZmFsc2V9',
      publicKey: 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEU-dlyytnRNS0bX0c9v8naV_6Lfb_Hf8ZfyaArlGTuoehDcCr8gGpFMdK8QDOmtIpY5Up6zFK5dG2q0fAg8jBNg',
      publicKeyAlgorithm: -7,
      transports: ['hybrid', 'internal'],
    },
    type: 'public-key',
  })

  if (!isAttestation(cred)) throw new Error('not attestation')

  expect(cred.id).toEqual('931QGw1poO_Pr-aBvHhhyw')
  expect(cred.rawId).toEqual(decodeBase64Url('931QGw1poO_Pr-aBvHhhyw'))
  expect(cred.clientData).toEqual({
    type: 'webauthn.create',
    challenge: 'a0lktcAs0csE4eAiuueeHt5VRQLCTXAjDJcXglho3IM',
    origin: 'https://maks11060.keenetic.link',
    crossOrigin: false,
  })
  expect(cred.authData).toEqual({
    // deno-fmt-ignore
    rpIdHash: new Uint8Array([
      248, 156, 119,  91,  96, 136, 142,
      146, 143, 156, 132,   8, 176, 121,
      65,  97, 212, 153, 125, 168,   8,
      106, 191, 133, 190, 174,  35, 190,
      235, 239, 172,  58
    ]),
    flags: {up: true, uv: true, be: true, bs: true, at: true, ed: false},
    counter: 0,
    attestedCredentialData: {
      AAGUID: new Uint8Array([
        234,
        155,
        141,
        102,
        77,
        1,
        29,
        33,
        60,
        228,
        182,
        180,
        140,
        181,
        117,
        212,
      ]),
      credentialIdLength: 16,
      credentialId: new Uint8Array([
        247,
        125,
        80,
        27,
        13,
        105,
        160,
        239,
        207,
        175,
        230,
        129,
        188,
        120,
        97,
        203,
      ]),
      credentialPublicKey: new Uint8Array([
        165,
        1,
        2,
        3,
        38,
        32,
        1,
        33,
        88,
        32,
        83,
        231,
        101,
        203,
        43,
        103,
        68,
        212,
        180,
        109,
        125,
        28,
        246,
        255,
        39,
        105,
        95,
        250,
        45,
        246,
        255,
        29,
        255,
        25,
        127,
        38,
        128,
        174,
        81,
        147,
        186,
        135,
        34,
        88,
        32,
        161,
        13,
        192,
        171,
        242,
        1,
        169,
        20,
        199,
        74,
        241,
        0,
        206,
        154,
        210,
        41,
        99,
        149,
        41,
        235,
        49,
        74,
        229,
        209,
        182,
        171,
        71,
        192,
        131,
        200,
        193,
        54,
      ]),
    },
  })

  expect(cred.attestation).toEqual({
    fmt: 'none',
    attStmt: {},
    authData: {
      // deno-fmt-ignore
      rpIdHash: new Uint8Array([
        248, 156, 119,  91,  96, 136, 142,
        146, 143, 156, 132,   8, 176, 121,
        65,  97, 212, 153, 125, 168,   8,
        106, 191, 133, 190, 174,  35, 190,
        235, 239, 172,  58
      ]),
      flags: {up: true, uv: true, be: true, bs: true, at: true, ed: false},
      counter: 0,
      attestedCredentialData: {
        AAGUID: new Uint8Array([234, 155, 141, 102, 77, 1, 29, 33, 60, 228, 182, 180, 140, 181, 117, 212]),
        credentialIdLength: 16,
        credentialId: new Uint8Array([247, 125, 80, 27, 13, 105, 160, 239, 207, 175, 230, 129, 188, 120, 97, 203]),
        // deno-fmt-ignore
        credentialPublicKey: new Uint8Array([
          165,   1,   2,   3,  38,  32,   1,  33,  88,  32,  83, 231,
          101, 203,  43, 103,  68, 212, 180, 109, 125,  28, 246, 255,
          39, 105,  95, 250,  45, 246, 255,  29, 255,  25, 127,  38,
          128, 174,  81, 147, 186, 135,  34,  88,  32, 161,  13, 192,
          171, 242,   1, 169,  20, 199,  74, 241,   0, 206, 154, 210,
          41,  99, 149,  41, 235,  49,  74, 229, 209, 182, 171,  71,
          192, 131, 200, 193,  54
        ]),
      },
    },
  })

  console.log(structuredClone(cred))
})

Deno.test('publicKeyCredentialFromJSON Assertion', async (t) => {
  const publicKey = await getPublicKey({
    publicKeyAlgorithm: -7,
    // deno-fmt-ignore
    publicKey: new Uint8Array([
      48,  89,  48,  19,   6,   7,  42, 134,  72, 206,  61,   2,
        1,   6,   8,  42, 134,  72, 206,  61,   3,   1,   7,   3,
      66,   0,   4,  20, 222,  91,  87, 255,  88, 164, 237, 126,
      228,  44, 232, 204, 190, 161,   2, 249, 120, 116,  58, 237,
      185, 173, 167, 113,   7, 146, 192,  54, 253,  17, 118,  80,
      96,  35, 129, 150, 253,  56, 220,  34,  92,  89, 129, 128,
      116, 186,  91, 181, 251, 228,  50,  89, 181, 234, 252, 139,
      79, 135,  23,  94,  48,  33, 163
    ]),
  })
  const cred = publicKeyCredentialFromJSON({
    authenticatorAttachment: 'platform',
    clientExtensionResults: {},
    id: 'wBCk_EC4zWD8cAll0sLZwyW1cIE9lvZNl8E6lFXxE5c',
    rawId: 'wBCk_EC4zWD8cAll0sLZwyW1cIE9lvZNl8E6lFXxE5c',
    // deno-fmt-ignore
    response: {
      authenticatorData: '-Jx3W2CIjpKPnIQIsHlBYdSZfagIar-Fvq4jvuvvrDoFAAAAAg',
      clientDataJSON: 'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoib1d1UklnbXZ6eWc1QW5ZRmJSb3E3Tk14TWFWSkdsVGpCZjFtZlEtcExrNCIsIm9yaWdpbiI6Imh0dHBzOi8vbWFrczExMDYwLmtlZW5ldGljLmxpbmsiLCJjcm9zc09yaWdpbiI6ZmFsc2UsIm90aGVyX2tleXNfY2FuX2JlX2FkZGVkX2hlcmUiOiJkbyBub3QgY29tcGFyZSBjbGllbnREYXRhSlNPTiBhZ2FpbnN0IGEgdGVtcGxhdGUuIFNlZSBodHRwczovL2dvby5nbC95YWJQZXgifQ',
      signature: 'MEYCIQDo85-BqqR7VPWya8FgH_ucS8A2sA7BYOqd1chonY5H_wIhAJKMPVC7AfOV_UviC6pQ2yjWz5CLcEe_oH3zPi5GBnZV',
    },
    type: 'public-key',
  })

  if (!isAssertion(cred)) throw new Error('not Assertion type')

  expect(cred.id).toEqual('wBCk_EC4zWD8cAll0sLZwyW1cIE9lvZNl8E6lFXxE5c')
  expect(cred.clientData).toEqual({
    type: 'webauthn.get',
    challenge: 'oWuRIgmvzyg5AnYFbRoq7NMxMaVJGlTjBf1mfQ-pLk4',
    origin: 'https://maks11060.keenetic.link',
    crossOrigin: false,
    other_keys_can_be_added_here: 'do not compare clientDataJSON against a template. See https://goo.gl/yabPex',
  })
  expect(cred.authData).toEqual({
    // deno-fmt-ignore
    rpIdHash: new Uint8Array([
      248, 156, 119,  91,  96, 136, 142,
      146, 143, 156, 132,   8, 176, 121,
      65,  97, 212, 153, 125, 168,   8,
      106, 191, 133, 190, 174,  35, 190,
      235, 239, 172,  58
    ]),
    flags: {up: true, uv: true, be: false, bs: false, at: false, ed: false},
    counter: 2,
    attestedCredentialData: null,
  })

  expect(await verifySignature(cred, publicKey)).toBeTruthy()

  console.log(structuredClone(cred))
})

Deno.test('verify assertion signature', async (t) => {
  const keys = [
    [
      -7,
      'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEAD9X-HUEQqLo6ld7CgpRwRIJkXMWuWfLyVn16N7syL4C_5WPRkE5kXhcU-yy-FGSBJNGUhlPqJueJxGJBtcU7g',
      {
        authenticatorData: 'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAw',
        clientDataJSON:
          'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiaHRYWnJ1UVFzSzhjQ0FyLTBJUFBMQSIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDUwNyIsImNyb3NzT3JpZ2luIjpmYWxzZSwib3RoZXJfa2V5c19jYW5fYmVfYWRkZWRfaGVyZSI6ImRvIG5vdCBjb21wYXJlIGNsaWVudERhdGFKU09OIGFnYWluc3QgYSB0ZW1wbGF0ZS4gU2VlIGh0dHBzOi8vZ29vLmdsL3lhYlBleCJ9',
        signature: 'MEQCIEtcxcn8BRm6BmZE3vghukbX-PcMR8o9WWBJI03RC4B0AiAYnBdiX1RMdUelPaAfqlwF92HqpDEgwfUErp4VoDCqZg',
        userHandle: 'Emoes5m8250vw7ItnM7-nw',
      },
    ],
    [
      -8,
      'MCowBQYDK2VwAyEAL7milh-tbyuXCwCBtgIxCgZA6HMdV8d6YaBSC_LFxN4',
      {
        authenticatorData: 'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAg',
        clientDataJSON:
          'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoidHRuMDh5YUowZnJxZXgtd05jQ0lLdyIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDUwNyIsImNyb3NzT3JpZ2luIjpmYWxzZSwib3RoZXJfa2V5c19jYW5fYmVfYWRkZWRfaGVyZSI6ImRvIG5vdCBjb21wYXJlIGNsaWVudERhdGFKU09OIGFnYWluc3QgYSB0ZW1wbGF0ZS4gU2VlIGh0dHBzOi8vZ29vLmdsL3lhYlBleCJ9',
        signature: 'dyfN_CoMPijGVyiBy5Udfe6Bc09hvRedjpBdVMr3D2-PVPkt_lmVwHBp6qpMDI_mJcei6niJxyqbMQvQZzwvAg',
        userHandle: 'sKVD_BnoSpi7GUaxok9EFA',
      },
    ],
    [
      -257,
      'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsxGh7GzeTrMgadrjdvlghyoMUtKXyKkBb23xFul5FCOxKkY4uSKA-TLO7Yh8Fd3RgsJHjDr2TH2kqH1IxbCZds2e9xz2GSUz0EK8SAALVJtjf1M3eicIaFSXSf88lIGms1Zm_cMSrp3PM0SQSwFAXylF3SXgD-Sz7ISqhyMSpmUNEI1Y9NieJDsEHL0efyyzpeis8L1PHYHcCj0sUOntOi3VKVY_AYKMsM0vpXlwYfQbqcQA_nV3MrpjgzIWjarGsODWa2hP5GPovZwbVg2WbARjqoyaP_cQ3StofWMAqIsM7cLny4BIKhNiHqNDGK2qOOiSGs4azU3ISZz7-JoN3wIDAQAB',
      {
        authenticatorData: 'SZYN5YgOjGh0NBcPZHZgW4_krrmihjLHmVzzuoMdl2MFAAAAAg',
        clientDataJSON:
          'eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiNmRYaTA1R25qMVd5eHdRQ2FpY3FjdyIsIm9yaWdpbiI6Imh0dHA6Ly9sb2NhbGhvc3Q6NDUwNyIsImNyb3NzT3JpZ2luIjpmYWxzZX0',
        signature:
          'QfGF0wqRew83d9gwfWUVV_pGjqbItBD77GVdVzAQkSfT5VklQqt1cYTrOWMjrRFsIilBQ_Yolm4-FjSknTvcb8Su7slB7nVbcasB2LDzg8mVLtRUYJobCL-aEWAp7cq2jxxVgLdIUZHIH-J4F9hwfmdCA7eOO25NxzvsudK-P9uA-QeXeze4mHq2n5Y8bC2OM7JXc9JEAFiQ-sExgdm8tLnZIjykkgBbrOr2eOfVEEI2Nv5C1jaWTJ587Z_enUjFp9TolCJgwcmSwdmV8eku_dQ6hEjE09VPLwoNBp_IIwtevDn9k-22bhMViPOs2mlZ8nWHoMIDeP7BXb-rSuVXRw',
        userHandle: 'S_qBcX8W-yqWBcD1BlmO3A',
      },
    ],
  ] as const

  for (const [alg, key, response] of keys) {
    const publicKey = await getPublicKey({
      publicKeyAlgorithm: alg,
      publicKey: decodeBase64Url(key),
    })
    const cred = publicKeyCredentialFromJSON({response} as any)
    if (!isAssertion(cred)) throw new Error('not Assertion type')

    expect(await verifySignature(cred, publicKey)).toBeTruthy()
  }
})
