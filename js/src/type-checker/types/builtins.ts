import { NType, NUnion } from './types'
import { EnumSpec, TypeSpec } from './TypeSpec'

export const str = new TypeSpec('str').instance()
export const int = new TypeSpec('int').instance()
export const float = new TypeSpec('float').instance()
export const char = new TypeSpec('char').instance()
export const unit = new TypeSpec('unit').instance()
unit.typeSpec.isUnit = true

// Oddly specific, but it's used by Operation and UnaryOperation because int has
// so many odd operator overloads.
export function isInt (type: NType): boolean {
  return type.type === 'named' && type.typeSpec === int.typeSpec
}

export function isMaybe (type: NType): boolean {
  return type.type == 'named' && type.typeSpec === maybe
}

export const number: NUnion = {
  type: 'union',
  types: [int.typeSpec, float.typeSpec],
}

export const list = new TypeSpec('list', 1)
export const map = new TypeSpec('map', 2)
export const cmd = new TypeSpec('cmd', 1)

// IMPORTANT: `false` needs to be first because that's how bool-type enums are
// represented in JS.
export const boolSpec = EnumSpec.make('bool', () => [
  ['false', []],
  ['true', []],
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
