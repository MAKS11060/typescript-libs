/**
 * Удаляем все вхождения "(...)" (включая вложенные содержимые) — рекурсивно.
 * Это превращает ":id(\d+)" в ":id".
 */
type StripRegex<S extends string> = S extends `${infer A}(${string})${infer B}` ? StripRegex<`${A}${B}`> : S

/**
 * Спаиваем группы: если встречаем "{Inner}?": делаем все параметры внутри Inner опциональными;
 * если просто "{Inner}": просто вставляем Inner.
 * Повторяем рекурсивно, чтобы раскрыть любую вложенность.
 */
type MakeParamOptionalInSegment<S extends string> = S extends `${infer Pref}:${infer Rest}`
  ? Rest extends `${infer Segment}/${infer Tail}`
    ? `${Pref}${MakeOptionalForSegment<Segment>}/${MakeParamOptionalInSegment<Tail>}`
  : `${Pref}${MakeOptionalForSegment<Rest>}`
  : S

/** Префикс ':' уже удалён при вызове; добавляем ':' обратно и гарантируем один '?' */
type MakeOptionalForSegment<Seg extends string> = Seg extends `${infer Name}?` ? `:${Name}?`
  : `:${Seg}?`

/**
 * ExpandGroups:
 *  - если находим `{Inner}?` — вставляем MakeParamOptionalInSegment<Inner>
 *  - если находим `{Inner}` — просто вставляем Inner
 * Повторяем, пока есть группы.
 */
type ExpandGroups<S extends string> = S extends `${infer Before}{${infer Inner}}?${infer After}`
  ? ExpandGroups<`${Before}${MakeParamOptionalInSegment<Inner>}${After}`>
  : S extends `${infer Before}{${infer Inner}}${infer After}` ? ExpandGroups<`${Before}${Inner}${After}`>
  : S

/**
 * Убираем оставшиеся одиночные '{' или '}' на всякий случай (защита).
 */
type StripBraces<S extends string> = S extends `${infer A}{${infer B}` ? StripBraces<`${A}${B}`>
  : S extends `${infer A}}${infer B}` ? StripBraces<`${A}${B}`>
  : S

/**
 * Нормализуем "много ?": "name???" -> "name?"
 */
type NormalizeOpt<S extends string> = S extends `${infer Rest}??` ? NormalizeOpt<`${Rest}?`>
  : S extends `${infer Name}?` ? `${Name}?`
  : S

/**
 * Очищаем хвостовые мусорные символы (на всякий случай).
 * Убираем всё после первого '}' или '{' или ')' или ' ' (пробел) — обычно их не должно быть.
 */
type CleanName<S extends string> = S extends `${infer N}}${string}` ? CleanName<N>
  : S extends `${infer N}{${string}` ? CleanName<N>
  : S extends `${infer N})${string}` ? CleanName<N>
  : S extends `${infer N} ${string}` ? CleanName<N>
  : S

/**
 * Извлечение одного параметра из сегмента:
 * - сегмент должен начинаться с ':'
 * - удаляем regexp (он уже убран выше, но оставляем защиту)
 * - очищаем мусор и нормализуем опциональность
 */
type ParamKeyFromSegment<Seg extends string> = Seg extends `:${infer Rest}` ? NormalizeOpt<CleanName<Rest>>
  : never

/**
 * Разбиваем путь на сегменты (без ведущего/концевого '/')
 */
type SplitPath<S extends string> = S extends '' ? []
  : S extends `/${infer Rest}` ? SplitPath<Rest>
  : S extends `${infer Seg}/${infer Rest}` ? [Seg, ...SplitPath<Rest>]
  : [S]

/**
 * Собираем ParamKeys из массива сегментов
 */
type ParamKeysFromSegments<Arr extends readonly string[]> = Arr extends
  [infer H extends string, ...infer T extends string[]] ? ParamKeyFromSegment<H> | ParamKeysFromSegments<T>
  : never

/**
 * Главный тип: сначала убираем regexp, затем разворачиваем группы,
 * затем убираем скобки, разбиваем и собираем параметры.
 */
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
      groups: ParamKeyToRecord<ParsePathname<T>>
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
