import { AliasSpec, EnumSpec, NType, NUnion, TypeSpec } from './types'

export const str = new TypeSpec('str').instance()
export const int = new TypeSpec('int').instance()
export const float = new TypeSpec('float').instance()
export const char = new TypeSpec('char').instance()
export const unit = new TypeSpec('unit').instance()

// Oddly specific, but it's used by Operation and UnaryOperation because int has
// so many odd operator overloads.
export function isInt (type: NType): boolean {
  return type.type === 'named' && type.typeSpec === int.typeSpec
}

// TODO: Module types are unit-like as well, I think
/**
 * Note that a unit type in this sense is any type that has only one variant.
 * This isn't just limited to the unit type `()`; an empty record type `{}` and
 * enums with only one fieldless variant are also unit types in this sense.
 *
 * The compiler usually optimises these into JavaScript `undefined` values.
 * Since there's only one variant of this type, the value is known at compile
 * time and doesn't need to be stored during runtime.
 */
export function isUnit (type: NType): boolean {
  const resolved = AliasSpec.resolve(type)
  return (
    (resolved.type === 'named' && resolved.typeSpec === unit.typeSpec) ||
    (resolved.type === 'record' && resolved.types.size === 0) ||
    (EnumSpec.isEnum(resolved) &&
      resolved.typeSpec.variants.size === 1 &&
      [...resolved.typeSpec.variants.values()][0].types?.length === 0)
  )
}

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
