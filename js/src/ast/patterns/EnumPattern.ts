import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { isUnitLike } from '../../type-checker/types/isUnitLike'
import { unknown } from '../../type-checker/types/types'
import { EnumSpec } from '../../type-checker/types/TypeSpec'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
  PatternCompilationResult,
} from './Pattern'

export class EnumPattern extends Base implements Pattern {
  variant: Identifier
  patterns: Pattern[]
  private _type?: EnumSpec

  constructor (
    pos: BasePosition,
    [, variant, rawPatterns]: schem.infer<typeof EnumPattern.schema>,
  ) {
    const patterns = rawPatterns.map(([, pattern]) => pattern)
    super(pos, [variant, ...patterns])
    this.variant = variant
    this.patterns = patterns
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    if (EnumSpec.isEnum(context.type)) {
      this._type = context.type.typeSpec
      if (context.type.typeSpec.variants.size > 1 && context.definite) {
        context.err({
          type: ErrorType.ENUM_PATTERN_DEF_MULT_VARIANTS,
          enum: context.type,
          variant: this.variant.value,
          otherVariants: [...context.type.typeSpec.variants.keys()].filter(
            variant => variant !== this.variant.value,
          ),
        })
      }
      const variant = context.type.typeSpec.variants.get(this.variant.value)
      if (variant) {
        // TODO: Check if variant is public if the type wasn't defined in the
        // file
        if (variant.types && variant.types.length !== this.patterns.length) {
          context.err({
            type: ErrorType.ENUM_PATTERN_FIELD_MISMATCH,
            enum: context.type,
            variant: this.variant.value,
            fields: variant.types.length,
            given: this.patterns.length,
          })
        }
        this.patterns.forEach((pattern, i) => {
          context.checkPattern(pattern, variant.types?.[i] || unknown)
        })
        return {}
      } else {
        context.err(
          {
            type: ErrorType.ENUM_PATTERN_NO_VARIANT,
            enum: context.type,
            variant: this.variant.value,
          },
          this.variant,
        )
      }
    } else if (context.type.type !== 'unknown') {
      context.err({
        type: ErrorType.PATTERN_MISMATCH,
        assignedTo: context.type,
        destructure: 'enum',
      })
    }
    for (const pattern of this.patterns) {
      context.checkPattern(pattern, unknown)
    }
    return {}
  }

  compilePattern (
    scope: CompilationScope,
    valueName: string,
  ): PatternCompilationResult {
    const representation = this._type!.representation
    const variant = this.variant.value
    const variantTypes = this._type!.variants.get(variant)?.types
    if (!variantTypes) {
      throw new Error(`${variant} either doesn't exist or has invalid types??`)
    }

    const statements: string[] = []
    const varNames: string[] = []
    let index = 0
    this.patterns.forEach((pattern, i) => {
      // Don't bother matching unit-like types; they're not stored in the enum
      // value anyways
      if (isUnitLike(variantTypes[i])) {
        return
      }

      const { statements: s, varNames: v } = pattern.compilePattern(
        scope,
        representation.type === 'maybe'
          ? valueName
          : representation.type === 'tuple'
          ? `${valueName}[${index}]`
          : `${valueName}[${index + 1}]`,
      )
      statements.push(...s)
      varNames.push(...v)
      index++
    })

    if (representation.type === 'bool') {
      // Statements should be empty because there's nothing to destructure from
      // a bool
      return {
        statements: [
          `if (${
            variant === representation.trueName ? '!' : ''
          }${valueName}) break;`,
        ],
        varNames,
      }
    } else if (representation.type === 'enum') {
      const {
        variants: { [variant]: variantId },
        nullable,
      } = representation
      return {
        statements: [
          variantId === null
            ? `if (!${valueName}) {`
            : `if (${
                nullable ? `${valueName} && ` : ''
              }${valueName}[0] === ${variantId}) {`,
          ...scope.context.indent(statements),
          '} else break;',
        ],
        varNames,
      }
    } else if (representation.type === 'union') {
      const { variants } = representation
      const index = variants.find(variantName => variantName === variant)
      return {
        statements: [
          `if (${valueName} === ${index}) {`,
          ...scope.context.indent(statements),
          '} else break;',
        ],
        varNames,
      }
    } else {
      if (representation.type !== 'unit' && representation.null) {
        if (representation.type === 'maybe') {
          statements.unshift(
            `if (${valueName} ${
              valueName === representation.null ? '!' : '='
            }== undefined) break;`,
          )
        } else {
          statements.unshift(
            `if (${
              valueName === representation.null ? '' : '!'
            }${valueName}) break;`,
          )
        }
      }
      return {
        statements,
        varNames,
      }
    }
  }

  toString (): string {
    return `<${this.variant}${this.patterns
      .map(pattern => ' ' + pattern)
      .join('')}>`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Identifier),
    schema.array(schema.tuple([schema.any, schema.guard(isPattern)])),
    schema.any,
  ])
}
