import {
  promptMultipleSelect as _promptMultipleSelect,
  PromptMultipleSelectOptions,
} from 'jsr:@std/cli/unstable-prompt-multiple-select'
import {promptSelect as _promptSelect, PromptSelectOptions} from 'jsr:@std/cli/unstable-prompt-select'

export const promptMultipleSelect = <const T extends string[]>(
  message: string,
  values: T,
  options?: PromptMultipleSelectOptions
): T => {
  return _promptMultipleSelect(message, values, options) as T
}

export const promptSelect = <T extends string>(message: string, values: T[], options?: PromptSelectOptions): T => {
  return _promptSelect(message, values, options) as T
}
