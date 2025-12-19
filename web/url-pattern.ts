// TODO: rewrite/improve pathname parser

type StripRegex<S extends string> = S extends `${infer A}(${string})${infer B}` ? StripRegex<`${A}${B}`> : S

type MakeParamOptionalInSegment<S extends string> = S extends `${infer Pref}:${infer Rest}`
  ? Rest extends `${infer Segment}/${infer Tail}`
    ? `${Pref}${MakeOptionalForSegment<Segment>}/${MakeParamOptionalInSegment<Tail>}`
  : `${Pref}${MakeOptionalForSegment<Rest>}`
  : S

type MakeOptionalForSegment<Seg extends string> = Seg extends `${infer Name}?` ? `:${Name}?`
  : `:${Seg}?`

type ExpandGroups<S extends string> = S extends `${infer Before}{${infer Inner}}?${infer After}`
  ? ExpandGroups<`${Before}${MakeParamOptionalInSegment<Inner>}${After}`>
  : S extends `${infer Before}{${infer Inner}}${infer After}` ? ExpandGroups<`${Before}${Inner}${After}`>
  : S

type StripBraces<S extends string> = S extends `${infer A}{${infer B}` ? StripBraces<`${A}${B}`>
  : S extends `${infer A}}${infer B}` ? StripBraces<`${A}${B}`>
  : S

type NormalizeOpt<S extends string> = S extends `${infer Rest}??` ? NormalizeOpt<`${Rest}?`>
  : S extends `${infer Name}?` ? `${Name}?`
  : S

type CleanName<S extends string> = S extends `${infer N}}${string}` ? CleanName<N>
  : S extends `${infer N}{${string}` ? CleanName<N>
  : S extends `${infer N})${string}` ? CleanName<N>
  : S extends `${infer N} ${string}` ? CleanName<N>
  : S

type ParamKeyFromSegment<Seg extends string> = Seg extends `:${infer Rest}` ? NormalizeOpt<CleanName<Rest>>
  : never

type SplitPath<S extends string> = S extends '' ? []
  : S extends `/${infer Rest}` ? SplitPath<Rest>
  : S extends `${infer Seg}/${infer Rest}` ? [Seg, ...SplitPath<Rest>]
  : [S]

type ParamKeysFromSegments<Arr extends readonly string[]> = Arr extends
  [infer H extends string, ...infer T extends string[]] ? ParamKeyFromSegment<H> | ParamKeysFromSegments<T>
  : never

export type ParamKeys<Path extends string> = ParamKeysFromSegments<
  SplitPath<
    StripBraces<
      ExpandGroups<
        StripRegex<Path>
      >
    >
  >
>

type ParsePathname<T extends string> = ParamKeys<T>

// --- helper ---
type ParamKeyToRecord<T extends string> = T extends `${infer R}?` //
  ? { [K in R]: string | undefined }
  : { [K in T]: string }

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

// type URLPatternTypedResult<Input extends URLPatternInput> = Input extends string //
//   ? URLPatternResult
//   : URLPatternResult & {
//     pathname: {
//       input: string
//       groups: ParamKeyToRecord<ParsePathname<Input>>
//     }
//   }
export type URLPatternTypedResult<T extends string | URLPatternInit> = T extends string //
  ? URLPatternResult & {
    pathname: {
      input: string
      groups: UnionToIntersection<ParamKeyToRecord<ParsePathname<T>>>
    }
  }
  : T extends {pathname: infer Pathname extends string} ? URLPatternTypedResult<Pathname>
  : never

export class URLPatternTyped<const T extends URLPatternInput> extends URLPattern {
  constructor(input?: T, options?: URLPatternOptions) {
    super(...arguments)
  }
  override exec(input: URLPatternInput, baseURL?: string): URLPatternTypedResult<T> | null {
    return super.exec(input, baseURL) as URLPatternTypedResult<T> | null
  }
}
