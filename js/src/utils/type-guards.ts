import moo from 'moo'
import { displayType } from './display-type'

export function isString (value: any): value is string {
  return typeof value === 'string'
}
export function isNumber (value: any): value is number {
  return typeof value === 'number'
}

// https://stackoverflow.com/a/58278753
export function isEnum<T> (enumObject: T) {
  const values = Object.values(enumObject)
  function isOfEnum (value: any): value is T[keyof T] {
    return values.includes(value)
  }
  return isOfEnum
}

export function isToken (value: any): value is moo.Token {
  return 'value' in value && 'offset' in value && 'text' in value &&
    'lineBreaks' in value && 'line' in value && 'col' in value &&
    isString(value.value) && isNumber(value.offset) && isString(value.text) &&
    isNumber(value.lineBreaks) && isNumber(value.line) && isNumber(value.col)
}

// https://dev.to/krumpet/generic-type-guard-in-typescript-258l
type Constructor<T> = { new (...args: any[]): T }
export function shouldBe<T> (ClassObject: Constructor<T>, value: any): asserts value is T {
  if (!(value instanceof ClassObject)) {
    console.log(value)
    throw new TypeError(`${value} (${displayType(value)}) is not a ${ClassObject.name}.`)
  }
}
export function shouldSatisfy<T> (guard: (value: any) => value is T, value: any): asserts value is T {
  if (!guard(value)) {
    console.log(value)
    throw new TypeError(`${value} (${displayType(value)}) does not satisfy ${guard.name}.`)
  }
}
