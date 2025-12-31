// TODO: rewrite/improve pathname parser

// --- V1 ---
/* type StripRegex<S extends string> = S extends `${infer A}(${string})${infer B}` ? StripRegex<`${A}${B}`> : S

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

type ParsePathname<T extends string> = ParamKeys<T> */

// --- V6 ---
/* type Special = '?' | '+' | '*' | '(' | '/' | '{' | '}';

type ExtractUntilSpecial<T, Acc extends string = ''> =
  T extends `${infer First}${infer Rest}`
    ? First extends Special
      ? [Acc, T]
      : ExtractUntilSpecial<Rest, `${Acc}${First}`>
    : [Acc, ''];

type ParseParam<T> =
  T extends `:${infer Rest}`
    ? ExtractUntilSpecial<Rest> extends [infer Name, infer Remaining]
      ? Remaining extends `?${infer Rest2}`
        ? { name: `${Name & string}?`; rest: Rest2 }
        : Remaining extends `+${infer Rest2}`
          ? { name: Name & string; rest: Rest2 }
          : Remaining extends `*${infer Rest2}`
            ? { name: Name & string; rest: Rest2 }
            : Remaining extends `(${string})${infer Rest2}`
              ? { name: Name & string; rest: Rest2 }
              : { name: Name & string; rest: Remaining & string }
      : never
    : never;

// Функция для добавления ? только к параметрам внутри группы с ?
type ProcessGroupWithOptional<T extends string, HasGroupOptional extends boolean = false> =
  T extends `${infer Pre}:${infer Rest}`
    ? ParseParam<`:${Rest}`> extends { name: infer Name, rest: infer Rest2 }
      ? Name extends string
        ? Name extends `${infer Base}?`
          ? `${Pre}:${Name}${ProcessGroupWithOptional<Rest2 & string, HasGroupOptional>}`
          : HasGroupOptional extends true
            ? `${Pre}:${Name}?${ProcessGroupWithOptional<Rest2 & string, HasGroupOptional>}`
            : `${Pre}:${Name}${ProcessGroupWithOptional<Rest2 & string, HasGroupOptional>}`
        : never
      : never
    : T;

type RemoveBraces<T> =
  T extends `${infer Pre}{${infer Inner}}?${infer Post}`
    ? `${Pre}${ProcessGroupWithOptional<Inner, true>}${RemoveBraces<Post>}`
    : T extends `${infer Pre}{${infer Inner}}${infer Post}`
      ? `${Pre}${Inner}${RemoveBraces<Post>}`
      : T;

type ParsePathnameHelper<T extends string> =
  T extends `${string}:${infer Rest}`
    ? ParseParam<`:${Rest}`> extends { name: infer Name, rest: infer Rest2 }
      ? Name | (Rest2 extends string ? ParsePathnameHelper<Rest2> : never)
      : never
    : never;

type ParsePathname<T extends string> = ParsePathnameHelper<RemoveBraces<T>>;
 */

// --- V7 --- // TODO: optimize code
type Special = '?' | '+' | '*' | '(' | '/' | '{' | '}'

type ExtractUntilSpecial<T, Acc extends string = ''> = T extends `${infer First}${infer Rest}`
  ? First extends Special ? [Acc, T]
  : ExtractUntilSpecial<Rest, `${Acc}${First}`>
  : [Acc, '']

type Inc<T extends any[]> = [...T, any]
type Dec<T extends any[]> = T extends [any, ...infer R] ? R : []

type ExtractUntilCloseParen<T, Depth extends any[] = [any], Acc extends string = ''> = T extends '' ? never
  : T extends `(${infer Rest}` //
    ? ExtractUntilCloseParen<Rest, Inc<Depth>, `${Acc}(`>
  : T extends `)${infer Rest}` ? Dec<Depth> extends [] ? [Acc, Rest]
    : ExtractUntilCloseParen<Rest, Dec<Depth>, `${Acc})`>
  : T extends `${infer F}${infer Rest}` //
    ? ExtractUntilCloseParen<Rest, Depth, `${Acc}${F}`>
  : never

type ParseParam<T> = T extends `:${infer Rest}`
  ? ExtractUntilSpecial<Rest> extends [infer Name, infer Remaining]
    ? Remaining extends `?${infer Rest2}` ? {name: `${Name & string}?`; rest: Rest2}
    : Remaining extends `+${infer Rest2}` ? {name: Name & string; rest: Rest2}
    : Remaining extends `*${infer Rest2}` ? {name: Name & string; rest: Rest2}
    : Remaining extends `(${infer R}`
      ? ExtractUntilCloseParen<R> extends [infer _, infer Rest2] ? {name: Name & string; rest: Rest2}
      : never
    : {name: Name & string; rest: Remaining & string}
  : never
  : never

// Function to add ? only to parameters within the group with ?
type ProcessGroupWithOptional<T extends string, HasGroupOptional extends boolean = false> = T extends
  `${infer Pre}:${infer Rest}`
  ? ParseParam<`:${Rest}`> extends {name: infer Name; rest: infer Rest2}
    ? Name extends string
      ? Name extends `${infer Base}?` ? `${Pre}:${Name}${ProcessGroupWithOptional<Rest2 & string, HasGroupOptional>}`
      : HasGroupOptional extends true ? `${Pre}:${Name}?${ProcessGroupWithOptional<Rest2 & string, HasGroupOptional>}`
      : `${Pre}:${Name}${ProcessGroupWithOptional<Rest2 & string, HasGroupOptional>}`
    : never
  : never
  : T

type ExtractGroupInner<T extends string, Depth extends any[] = [], Acc extends string = ''> = T extends '' //
  ? never
  : T extends `(${infer Rest}` //
    ? ExtractGroupInner<Rest, Inc<Depth>, `${Acc}(`>
  : T extends `)${infer Rest}` ? Depth extends [] ? never
    : ExtractGroupInner<Rest, Dec<Depth>, `${Acc})`>
  : T extends `}${infer Rest}` ? Depth extends [] ? [Acc, Rest]
    : ExtractGroupInner<Rest, Depth, `${Acc}}`>
  : T extends `${infer F}${infer Rest}` //
    ? ExtractGroupInner<Rest, Depth, `${Acc}${F}`>
  : never

type BuildPath<T extends string, Acc extends string = ''> = T extends '' ? Acc
  : T extends `:${infer Rest}`
    ? ExtractUntilSpecial<Rest> extends [infer Name, infer Remaining extends string]
      ? Remaining extends `?${infer Rest2}` ? BuildPath<Rest2, `${Acc}:${Name & string}?`>
      : Remaining extends `+${infer Rest2}` ? BuildPath<Rest2, `${Acc}:${Name & string}+`>
      : Remaining extends `*${infer Rest2}` ? BuildPath<Rest2, `${Acc}:${Name & string}*`>
      : Remaining extends `(${infer R}`
        ? ExtractUntilCloseParen<R> extends [infer Regex extends string, infer Rest2 extends string]
          ? BuildPath<Rest2, `${Acc}:${Name & string}(${Regex})`>
        : never
      : BuildPath<Remaining, `${Acc}:${Name & string}`>
    : never
  : T extends `{${infer U}`
    ? ExtractGroupInner<U> extends [infer Inner extends string, infer V extends string]
      ? V extends `?${infer Post}`
        ? ProcessGroupWithOptional<BuildPath<Inner>, true> extends infer Processed extends string
          ? BuildPath<Post, `${Acc}${Processed}`>
        : never
      : BuildPath<V, `${Acc}${BuildPath<Inner>}`>
    : never
  : T extends `${infer F}${infer Rest}` ? BuildPath<Rest, `${Acc}${F}`>
  : never

type RemoveBraces<T extends string> = BuildPath<T>

type ParsePathnameHelper<T extends string> = T extends `${string}:${infer Rest}`
  ? ParseParam<`:${Rest}`> extends {name: infer Name; rest: infer Rest2}
    ? Name | (Rest2 extends string ? ParsePathnameHelper<Rest2> : never)
  : never
  : never

type ParsePathname<T extends string> = ParsePathnameHelper<RemoveBraces<T>>

// --- helper ---
type ParamKeyToRecord<T extends string> = T extends `${infer R}?` //
  ? { [K in R]: string | undefined }
  : { [K in T]: string }

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never

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
