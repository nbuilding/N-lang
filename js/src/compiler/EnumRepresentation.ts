import { isUnitLike } from '../type-checker/types/isUnitLike'
import { EnumSpec } from '../type-checker/types/TypeSpec'

/**
 * The JS representation of an enum.
 *
 * A null variant is if the enum has exactly one variant with no fields; it's
 * represented as `undefined` in JS.
 *
 * Fields containing unit-like types are assumed to be not a field, and they
 * won't be stored in the enum variant.
 *
 * - `union` - If there are multiple variants, and all of them have no fields,
 *   then it's represented as an integer starting with 0.
 *   - `unit` - A special case if there's only one variant. Represented as
 *     `undefined`.
 *   - `bool` - A special case if there's only two variants. The first variant
 *     will be `false`, and the second will be `true`.
 * - `tuple` - If there is only one non-null variant. It's represented as a
 *   tuple (array) for each of its fields. Either the other variant is null or
 *   there is no other variant.
 *   - `maybe` - A special case of `tuple` if there's only one non-unit-like
 *     field in the non-null variant. It's represented as the field value
 *     itself, with no array wrapped around it.
 * - `enum` - For all other cases. It's represented as a tuple, but the first
 *   item is a number identifying the variant.
 */
export type EnumRepresentation =
  | { type: 'unit' }
  | {
      type: 'bool'

      /**
       * The name of the variant represented as `true` in JS.
       */
      trueName: string
    }
  | {
      type: 'union'

      /**
       * An array of variant names. The index is the variant's representation
       * during runtime.
       */
      variants: string[]
    }
  | {
      type: 'maybe' | 'tuple'

      /** The name of the null variant, if it exists */
      null?: string

      /** The name of the non-null variant */
      nonNull: string
    }
  | {
      type: 'enum'

      /**
       * An object map between a variant name and its variant ID, or null if
       * it's the null variant.
       */
      variants: Record<string, number | null>

      nullable: boolean
    }

export function normaliseEnum (enumTypeSpec: EnumSpec): EnumRepresentation {
  /** Variant names with no fields */
  const fieldlessVariants: string[] = []
  /** Variant names with the number of fields */
  const fieldfulVariants: [string, number][] = []
  for (const [name, variant] of enumTypeSpec.variants) {
    if (!variant.types) {
      throw new Error(
        `Variant ${name} has types=null despite passing type checking??`,
      )
    }
    const nonUnitLikeTypeCount = variant.types.filter(type => !isUnitLike(type))
      .length
    if (nonUnitLikeTypeCount === 0) {
      fieldlessVariants.push(name)
    } else {
      fieldfulVariants.push([name, nonUnitLikeTypeCount])
    }
  }
  if (fieldfulVariants.length === 0) {
    if (fieldlessVariants.length === 1) {
      return { type: 'unit' }
    } else if (fieldlessVariants.length === 2) {
      return { type: 'bool', trueName: fieldlessVariants[1] }
    } else {
      return { type: 'union', variants: fieldlessVariants }
    }
  } else if (fieldlessVariants.length <= 1 && fieldfulVariants.length === 1) {
    const [name, fields] = fieldfulVariants[0]
    // `fields` must be >= 1; otherwise it'd be fieldless
    return {
      type: fields === 1 ? 'maybe' : 'tuple',
      nonNull: name,
      null: fieldlessVariants[0],
    }
  } else {
    const nullable = fieldlessVariants.length === 1
    const variants: Record<string, number | null> = {}
    ;[...enumTypeSpec.variants].forEach(([name, variant], i) => {
      if (!variant.types) {
        throw new Error(
          `Variant ${name} has types=null despite passing type checking??`,
        )
      }
      variants[name] = nullable && fieldlessVariants[0] === name ? null : i
    })
    return { type: 'enum', variants, nullable }
  }
}
