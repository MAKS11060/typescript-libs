import {crypto, type DigestAlgorithmName} from '@std/crypto'

type _Uint8Array = ReturnType<Uint8Array<ArrayBuffer>['slice']>

export async function hash(
  alg: DigestAlgorithmName,
  data: BufferSource | AsyncIterable<BufferSource> | Iterable<BufferSource>,
): Promise<_Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest(alg, data),
  )
}
