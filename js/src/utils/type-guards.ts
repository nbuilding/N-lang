import moo from 'moo'

export function isString (value: any): value is string {
  return typeof value === 'string'
}
export function isNumber (value: any): value is number {
  return typeof value === 'number'
}

export function isToken (value: any): value is moo.Token {
  return 'value' in value && 'offset' in value && 'text' in value &&
    'lineBreaks' in value && 'line' in value && 'col' in value &&
    isString(value.value) && isNumber(value.offset) && isString(value.text) &&
    isNumber(value.lineBreaks) && isNumber(value.line) && isNumber(value.col)
}

function displayValueType (value: any): string {
  if (value === null) {
    return 'null'
  } else if (typeof value === 'object') {
    return value.constructor.name
  } else {
    return typeof value
  }
}

// https://dev.to/krumpet/generic-type-guard-in-typescript-258l
type Constructor<T> = { new (...args: any[]): T }
export function shouldBe<T> (ClassObject: Constructor<T>, value: any): asserts value is T {
  if (!(value instanceof ClassObject)) {
    throw new TypeError(`${value} (${displayValueType(value)}) is not a ${ClassObject.name}.`)
  }
}
export function shouldSatisfy<T> (guard: (value: any) => value is T, value: any): asserts value is T {
  if (!guard(value)) {
    throw new TypeError(`${value} (${displayValueType(value)}) does not satisfy ${guard.name}.`)
  }
}
