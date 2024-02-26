import {decodeHex, encodeHex} from 'https://deno.land/std/encoding/hex.ts'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

type AesKeyOptions = {
  length?: 128 | 196 | 256
  ivLen?: 12 | 16
}

export const generateKeyAesGcm = async (options: AesKeyOptions = {}) => {
  options.length ??= 256
  const iv = crypto.getRandomValues(new Uint8Array(options.ivLen || 12))
  const key = await crypto.subtle.generateKey(
    {name: 'AES-GCM', length: options.length},
    true,
    ['encrypt', 'decrypt']
  )
  return {key, iv}
}

export const exportKeyAesGcm = async (
  keys: Awaited<ReturnType<typeof generateKeyAesGcm>>
) => {
  return {
    key: encodeHex(await crypto.subtle.exportKey('raw', keys.key)),
    iv: encodeHex(keys.iv),
  }
}

type ImportKeyAesGcmOptions = {
  iv: string
  key: string
}

export const importKeyAesGcm = async (options: ImportKeyAesGcmOptions) => {
  const iv = decodeHex(options.iv)
  const key = await crypto.subtle.importKey(
    'raw',
    decodeHex(options.key),
    {name: 'AES-GCM'},
    true,
    ['encrypt', 'decrypt']
  )
  return {key, iv}
}

type aesEncryptConfig = {
  key: CryptoKey
  iv: ArrayBuffer
}

export const aesEncrypt = ({key, iv}: aesEncryptConfig) => {
  const encrypt = (data: ArrayBuffer): Promise<ArrayBuffer> => {
    return crypto.subtle.encrypt({name: key.algorithm.name, iv}, key, data)
  }

  const decrypt = (data: ArrayBuffer): Promise<ArrayBuffer> => {
    return crypto.subtle.decrypt({name: key.algorithm.name, iv}, key, data)
  }

  return {encrypt, decrypt}
}

/**
 * @example
 * ```ts
 * const text = 'hello world' // input data
 *
 * const aesKey = await generateKeyAesGcm()
 * const {encrypt, decrypt} = aesEncryptString(aesKey)
 *
 * const out = await encrypt(text)
 * const data = await decrypt(out)
 * ```
 */
export const aesEncryptString = ({key, iv}: aesEncryptConfig) => {
  const encrypt = async (data: string): Promise<ArrayBuffer> => {
    return await crypto.subtle.encrypt(
      {name: key.algorithm.name, iv},
      key,
      encoder.encode(data)
    )
  }

  const decrypt = async (data: ArrayBuffer): Promise<string> => {
    const out = await crypto.subtle.decrypt(
      {name: key.algorithm.name, iv},
      key,
      data
    )
    return decoder.decode(out)
  }

  return {encrypt, decrypt}
}

/**
 * @example
 * ```ts
 * type Data = {msg: string}
 *
 * const aesKey = await generateKeyAesGcm()
 * const {encrypt, decrypt} = aesEncryptObject<Data>(aesKey)
 *
 * const out = await encrypt({msg: 'hello'}) // ArrayBuffer
 * const data = await decrypt(out) // {msg: 'hello'}
 * ```
 */
export const aesEncryptObject = <T extends object>(init: aesEncryptConfig) => {
  const aes = aesEncryptString(init)
  const encrypt = (data: T): Promise<ArrayBuffer> => {
    return aes.encrypt(JSON.stringify(data))
  }

  const decrypt = async <R extends T>(data: ArrayBuffer): Promise<R> => {
    return JSON.parse(await aes.decrypt(data))
  }

  return {encrypt, decrypt}
}
