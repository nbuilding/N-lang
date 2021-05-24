import { EnumSpec, NUnion, TypeSpec } from './types'

export const str = new TypeSpec('str').instance()
export const int = new TypeSpec('int').instance()
export const float = new TypeSpec('float').instance()
export const char = new TypeSpec('char').instance()
export const unit = new TypeSpec('unit').instance()

export const number: NUnion = {
  type: 'union',
  types: [int.typeSpec, float.typeSpec],
}

export const list = new TypeSpec('list', 1)
export const map = new TypeSpec('map', 2)
export const cmd = new TypeSpec('cmd', 1)

export const boolSpec = EnumSpec.make('bool', () => [
  ['true', []],
  ['false', []],
])
// I usually expect bool to be a native type instance
export const bool = boolSpec.instance()
export const maybe = EnumSpec.make(
  'maybe',
  t => [
    ['yes', [t]],
    ['none', []],
  ],
  't',
)
export const result = EnumSpec.make(
  'result',
  (o, e) => [
    ['ok', [o]],
    ['err', [e]],
  ],
  'o',
  'e',
)
