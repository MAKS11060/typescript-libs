import {KeyAlg, keyAlg, decodeKeyHex} from './jwk.ts'

type importRawKey = {
  alg: KeyAlg
  public: string
  private?: string
}

type importRawKeyPair = {
  alg: KeyAlg
  public: string
  private: string
}

export const importRawKey = async (options: importRawKey) => {
  return options.private
    ? await decodeKeyHex(options)
    : await decodeKeyHex(options)
}

export const importRawKeyPair = async (options: importRawKeyPair) => {
  const {alg, private: _private, public: _pub} = options
  const privateKey = await decodeKeyHex({alg, public: _pub, private: _private})
  const publicKey = await decodeKeyHex({alg, public: _pub})
  return {privateKey, publicKey} as CryptoKeyPair
}

export const generateKeyPair = async (alg: KeyAlg) => {
  const keys = await crypto.subtle.generateKey(keyAlg(alg), true, [
    'sign',
    'verify',
  ])
  return keys as CryptoKeyPair
}
