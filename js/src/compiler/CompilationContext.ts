import { generateNames } from '../../test/unit/utils/generate-names'
import { Base } from '../ast/base'
import { EnumSpec, NModule, NRecord, NType } from '../type-checker/types/types'

export class CompilationContext {
  helpers = {
    modulo: 'modulo_n',
  }

  // TODO
  private _typeCache: Map<Base, NType> = new Map()

  private _id = 0

  private _recordCache: Map<string, Record<string, string>> = new Map()

  private _enumCache: Map<
    EnumSpec,
    { mangled: Record<string, string[] | null>; nullable: boolean }
  > = new Map()

  genVarName (name: string = '') {
    return `${name}_${this._id++}`
  }

  getType (base: Base): NType {
    const type = this._typeCache.get(base)
    if (!type) {
      throw new Error('Why is there no cached type for this?')
    }
    return type
  }

  indent (lines: string[]): string[] {
    return lines.map(line => '  ' + line)
  }

  // TODO: I think we should not make modules record-like during runtime
  /** Returns an object map between record field names and mangled names */
  normaliseRecord (recordType: NRecord | NModule): Record<string, string> {
    // Normalise keys by alphabetising them to get a unique record ID
    const sortedKeys = [...recordType.types.keys()].sort()
    const recordId = sortedKeys.join(' ')
    const cached = this._recordCache.get(recordId)
    if (cached) {
      return cached
    }
    const mangled: Record<string, string> = {}
    const names = generateNames()
    for (const key of sortedKeys) {
      mangled[key] = names.next().value
    }
    this._recordCache.set(recordId, mangled)
    return mangled
  }

  /**
   * Returns an object map between enum variant names and mangled property
   * names. If an enum has exactly one variant, then it'll be null in the object
   * map.
   *
   * Enums are represented as normal objects in JavaScript. For example,
   * `result[str, float]` might be represented as `{ ok: string }` or `{ err:
   * number }`. To determine the variant, N uses the `in` operator: `'ok' in
   * result`. If a variant has no fields, then N uses `true`.
   *
   * Exceptions:
   * - The native `bool` enum uses JavaScript booleans
   * - If exactly one variant has no fields, then it'll be represented as
   *   `undefined`. (The enum is called "nullable.")
   * - If the enum only has one variant, then it'll be represented as a tuple
   *   (array).
   */
  normaliseEnum (
    enumTypeSpec: EnumSpec,
  ): { mangled: Record<string, string[] | null>; nullable: boolean } {
    const cached = this._enumCache.get(enumTypeSpec)
    if (cached) {
      return cached
    }
    const nullable =
      [...enumTypeSpec.variants.values()].filter(
        variant => variant.types?.length === 0,
      ).length === 1
    const sorted = [...enumTypeSpec.variants].sort((a, b) =>
      a[0].localeCompare(b[0]),
    )
    const mangled: Record<string, string[] | null> = {}
    const names = generateNames()
    for (const [name, variant] of sorted) {
      if (!variant.types) continue
      if (variant.types.length === 0) {
        if (nullable) {
          mangled[name] = null
        } else {
          mangled[name] = [names.next().value]
        }
      } else {
        mangled[name] = variant.types.map(() => names.next().value)
      }
    }
    const result = { mangled, nullable }
    this._enumCache.set(enumTypeSpec, result)
    return result
  }
}
