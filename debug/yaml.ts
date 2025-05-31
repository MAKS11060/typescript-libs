import * as YAML from '@std/yaml'

const printLine = (text: string, isMultiline?: boolean) => {
  const [key, ...props] = text.split(':')
  const prop = props.join(':').trim()

  if (!key.length) return console.log()

  const isArrayItem = key.trim().startsWith(' - ')
  const isType = key.trim() === 'type'

  if (isArrayItem) {
    const [space, item] = key.split('-', 2)
    console.log(`${space}-%c${item}`, 'color: green')
  } else if (isType) {
    console.log(`%c${key}: %c${prop}`, 'color: inherit', 'color: orange')
  } else {
    !isMultiline
      ? console.log(`%c${key}: %c${prop}`, 'color: inherit', 'color: green')
      : console.log(`%c${key}`, 'color: green')
  }
}

export const logYAML = (data: unknown, options?: YAML.StringifyOptions) => {
  const text = YAML.stringify(data, options)
  let isMultiline = false
  for (const line of text.split('\n')) {
    printLine(line, isMultiline)
    isMultiline = line.endsWith('>-')
  }
}

console.yaml = logYAML

declare global {
  interface Console {
    yaml(data: unknown, options?: YAML.StringifyOptions): void
  }
}
