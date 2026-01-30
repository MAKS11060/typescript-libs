export class RezkaError extends Error {
  override name = this.constructor.name
  constructor(message: string, public readonly context?: Record<string, any>) {
    super(message)
  }
}

// Ошибка сети (404, 503 и т.д.)
export class RezkaFetchError extends RezkaError {
  constructor(public readonly response: Response) {
    super(`HTTP ${response.status}: ${response.statusText}`, {url: response.url})
  }
}

// Ошибка парсинга (сайт поменял верстку)
export class RezkaParseError extends RezkaError {
  constructor(message: string, htmlSnippet?: string) {
    super(message, {snippet: htmlSnippet?.slice(0, 100)})
  }
}

// Ошибка валидации данных (неверный тип контента)
export class RezkaValidationError extends RezkaError {}
