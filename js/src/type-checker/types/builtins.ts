import { EnumTypeSpec, TypeSpec } from './types'

export const str = new TypeSpec('str').instance([])
export const int = new TypeSpec('int').instance([])
export const float = new TypeSpec('float').instance([])
export const char = new TypeSpec('char').instance([])
export const unit = new TypeSpec('unit').instance([])

export const list = new TypeSpec('list', 1)
export const map = new TypeSpec('map', 2)
export const cmd = new TypeSpec('cmd', 1)

export const bool = EnumTypeSpec.make('bool', () => [
  ['true', []],
  ['false', []],
])
export const maybe = EnumTypeSpec.make(
  'maybe',
  t => [
    ['yes', [t]],
    ['none', []],
  ],
  't',
)
export const result = EnumTypeSpec.make(
  'result',
  (o, e) => [
    ['ok', [o]],
    ['err', [e]],
  ],
  'o',
  'e',
)
