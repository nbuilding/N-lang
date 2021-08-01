import { NType } from './types'
import { AliasSpec, EnumSpec } from './TypeSpec'

/**
 * Note that a unit type in this sense is any type that has only one variant.
 * This isn't just limited to the unit type `()`; an empty record type `{}` and
 * enums with only one fieldless variant are also unit types in this sense.
 *
 * The compiler usually optimises these into JavaScript `undefined` values.
 * Since there's only one variant of this type, the value is known at compile
 * time and doesn't need to be stored during runtime.
 */
export function isUnitLike (type: NType): boolean {
  const resolved = AliasSpec.resolve(type)
  return (
    (resolved.type === 'named' && resolved.typeSpec.isUnit) ||
    (resolved.type === 'record' && resolved.types.size === 0) ||
    resolved.type === 'module' ||
    (EnumSpec.isEnum(resolved) &&
      resolved.typeSpec.representation.type === 'unit')
  )
}
