import { generateNames } from '../../test/unit/utils/generate-names'
import { Block } from '../ast'
import { Base } from '../ast/base'
import { boolSpec } from '../type-checker/types/builtins'
import { EnumSpec, NRecord } from '../type-checker/types/types'
import { CompilationGlobalScope } from './CompilationGlobalScope'

interface HasExports {
  names: Map<string, string>
}

/**
 * The JS representation of an enum.
 *
 * A null variant is if the enum has exactly one variant with no fields; it's
 * represented as `undefined` in JS.
 *
 * - `bool` - If the enum spec is `bool`, it'll use native JS booleans.
 * - `unit` - If there's only one variant without any fields, it's unit-like and
 *   is represented as `undefined`.
 * - `tuple` - If there is only one non-null variant. It's represented as a
 *   tuple (array) for each of its fields. Either the other variant is null or
 *   there is no other variant.
 * - `maybe` - A special case of `tuple` if there's only one non-unit-like field
 *   in the non-null variant. It's represented as the field value itself, with
 *   no array wrapped around it.
 * - `enum` - For all other cases. It's represented as a tuple, but the first
 *   item is a number identifying the variant.
 */
type EnumRepresentation =
  | { type: 'bool' }
  | { type: 'unit' }
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

export class CompilationContext {
  helpers = {
    modulo: 'modulo_n',
    assertValue: 'assertValue_n',
  }

  valueAssertions = 0

  /** Maps module absolute paths to their scopes */
  modules: Record<string, HasExports> = {}

  globalScope = new CompilationGlobalScope(this)

  private _id = 0

  private _recordCache: Map<string, Record<string, string>> = new Map()

  private _enumCache: Map<EnumSpec, EnumRepresentation> = new Map()

  genVarName (name: string = '') {
    return `${name}_${this._id++}`
  }

  indent (lines: string[]): string[] {
    return lines.map(line => '  ' + line)
  }

  /** Returns an object map between record field names and mangled names */
  normaliseRecord (recordType: NRecord): Record<string, string> {
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
   * See `EnumRepresentation` for how enums are represented in JS.
   */
  normaliseEnum (enumTypeSpec: EnumSpec): EnumRepresentation {
    const cached = this._enumCache.get(enumTypeSpec)
    if (cached) {
      return cached
    }
    let result: EnumRepresentation
    if (enumTypeSpec === boolSpec) {
      result = { type: 'bool' }
    } else {
      const fieldlessVariants: string[] = []
      const fieldfulVariants: [string, number][] = []
      for (const [name, variant] of enumTypeSpec.variants) {
        if (!variant.types) {
          throw new Error(
            `Variant ${name} has types=null despite passing type checking??`,
          )
        }
        if (variant.types.length === 0) {
          fieldlessVariants.push(name)
        } else {
          fieldfulVariants.push([name, variant.types.length])
        }
      }
      if (fieldlessVariants.length === 1 && fieldfulVariants.length === 0) {
        result = { type: 'unit' }
      } else if (
        fieldlessVariants.length <= 1 &&
        fieldfulVariants.length === 1
      ) {
        const [name, fields] = fieldfulVariants[0]
        // `fields` must be >= 1; otherwise it'd be fieldless
        result = {
          type: fields === 1 ? 'maybe' : 'tuple',
          nonNull: name,
          null: fieldlessVariants[0],
        }
      } else {
        const nullable = fieldlessVariants.length === 1
        const sorted = [...enumTypeSpec.variants].sort((a, b) =>
          a[0].localeCompare(b[0]),
        )
        const variants: Record<string, number | null> = {}
        sorted.forEach(([name, variant], i) => {
          if (!variant.types) {
            throw new Error(
              `Variant ${name} has types=null despite passing type checking??`,
            )
          }
          variants[name] = nullable && variant.types.length === 0 ? null : i
        })
        result = { type: 'enum', variants, nullable }
      }
    }
    this._enumCache.set(enumTypeSpec, result)
    return result
  }

  compile (block: Block, moduleId?: string): string[] {
    const scope = this.globalScope.inner()
    if (moduleId) {
      this.modules[moduleId] = scope
    }
    return block.compileStatement(scope).statements
  }
}
