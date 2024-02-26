/**
 *
 * @example
 * ```ts
 * enum Flags {flag1, flag2, flag3}
 * const flags = new Bits<Flags>()
 *
 * flags.set(Flags.flag1)
 * flags.clear(Flags.flag2)
 * flags.toggle(Flags.flag3)
 *
 * flags.toBin()
 * flags.value // 101
 * ```
 */
export class Bits<Flags extends number = number> {
  #value: number

  constructor(value: number = 0) {
    this.#value = value
  }

  get value() {
    return this.#value
  }

  /**
   * @example
   * ```ts
   * const b = Bits.from(255)
   * b.value.toString(2) // 11111111
   * ```
   */
  static from<T extends number>(value: number) {
    return new this<T>(value)
  }

  /**
   * @example
   * ```ts
   * const b = Bits.from('10101010')
   * b.value // 170
   * ```
   */
  static fromBin<T extends number>(value: string) {
    return new this<T>(parseInt(value, 2))
  }

  /**
   * @example
   * ```ts
   * const b = Bits.fromHex('ff')
   * b.value.toString(16) // ff
   * ```
   */
  static fromHex<T extends number>(value: string) {
    return new this<T>(parseInt(value, 16))
  }

  static bit(n: number) {
    return 1 << n
  }

  has(bit: Flags) {
    return (this.#value & Bits.bit(bit)) !== 0
  }

  set(bit: Flags) {
    this.#value |= Bits.bit(bit)
    return this
  }

  clear(bit: Flags) {
    this.#value &= ~Bits.bit(bit)
    return this
  }

  toggle(bit: Flags) {
    this.#value ^= Bits.bit(bit)
    return this
  }

  toBin(): string {
    return this.#value.toString(2)
  }

  toHex(): string {
    return this.#value.toString(16)
  }

  toJSON(): number {
    return this.#value
  }
}
