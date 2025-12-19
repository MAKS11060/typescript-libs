// @generated file from wasmbuild -- do not edit
// deno-lint-ignore-file
// deno-fmt-ignore-file

export function signature_from_image(data: Uint8Array): JsSignature
export function signature_from_hash(data: string): JsSignature
export function resize_image(data: Uint8Array): Uint8Array
/**
 * Chroma subsampling format
 */
export enum ChromaSampling {
  /**
   * Both vertically and horizontally subsampled.
   */
  Cs420 = 0,
  /**
   * Horizontally subsampled.
   */
  Cs422 = 1,
  /**
   * Not subsampled.
   */
  Cs444 = 2,
  /**
   * Monochrome.
   */
  Cs400 = 3,
}
export class JsSignature {
  private constructor()
  free(): void
  toString(): string
  readonly avgl: Array<any>
  readonly sig: Array<any>
}
