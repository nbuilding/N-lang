import moo from 'moo'
import { displayType } from './display-type'

export function isString (value: unknown): value is string {
  return typeof value === 'string'
}
export function isNumber (value: unknown): value is number {
  return typeof value === 'number'
}

// https://stackoverflow.com/a/58278753
export function isEnum<T> (
  enumObject: T,
): (value: unknown) => value is T[keyof T] {
  const values = Object.values(enumObject)
  function isOfEnum (value: unknown): value is T[keyof T] {
    return values.includes(value)
  }
  return isOfEnum
}

// https://github.com/typescript-eslint/typescript-eslint/issues/1071#issuecomment-541955753
export function isObjectLike (
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isToken (value: unknown): value is moo.Token {
  return (
    isObjectLike(value) &&
    'value' in value &&
    'offset' in value &&
    'text' in value &&
    'lineBreaks' in value &&
    'line' in value &&
    'col' in value &&
    isString(value.value) &&
    isNumber(value.offset) &&
    isString(value.text) &&
    isNumber(value.lineBreaks) &&
    isNumber(value.line) &&
    isNumber(value.col)
  )
}

// https://dev.to/krumpet/generic-type-guard-in-typescript-258l
type Constructor<T> = { new (...args: unknown[]): T }
export function shouldBe<T> (
  ClassObject: Constructor<T>,
  value: unknown,
): asserts value is T {
  if (!(value instanceof ClassObject)) {
    throw new TypeError(
      `${value} (${displayType(value)}) is not a ${ClassObject.name}.`,
    )
  }
}
export function shouldSatisfy<T> (
  guard: (value: unknown) => value is T,
  value: unknown,
): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(
      `${value} (${displayType(value)}) does not satisfy ${guard.name}.`,
    )
  }
}
