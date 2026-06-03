export const Internal = Symbol('Internal')
export const InternalRef = Symbol('InternalRef')

export interface Ref<T> {
  [Internal]: T
  [InternalRef]: {
    summary?: string
    description?: string
  }

  /**
   * Add summary for `reference`
   *
   * ```yaml
   * $ref: '#/components/[component]/[ref-name]'
   * summary: # <-- HERE
   * ```
   */
  summary(summary: string): Ref<T>

  /**
   * Add description for `reference`
   *
   * ```yaml
   * $ref: '#/components/[component]/[ref-name]'
   * description: # <-- HERE
   * ```
   */
  describe(description: string): Ref<T>
}

export type MaybeRef<T> = T | Ref<T>
// export type MaybeRef<T> = T extends Ref<T> ? Ref<T> : T

export const createRef = <T>(
  value: T,
  ref?: Ref<T>[typeof InternalRef],
): Ref<T> => {
  return {
    get [Internal]() {
      return value
    },
    [InternalRef]: ref ?? {},
    summary(summary) {
      return createRef(value, {...this[InternalRef], summary})
    },
    describe(description) {
      return createRef(value, {...this[InternalRef], description})
    },
  }
}

export const deRef = <T>(ref: Ref<T>) => {
  return {
    value: ref[Internal],
    /** Ref metadata */
    ref: ref[InternalRef],
  }
}

export const isRef = <T>(target: unknown): target is Ref<T> => {
  return !!target && typeof target === 'object' && InternalRef in target
}
