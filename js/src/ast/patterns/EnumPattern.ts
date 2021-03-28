import { ErrorType } from '../../type-checker/errors/Error'
import { EnumTypeSpec } from '../../type-checker/types/type-specs'
import { NType, Type } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
} from './Pattern'

export class EnumPattern extends Base implements Pattern {
  variant: Identifier
  patterns: Pattern[]

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
    let innerTypes: NType[] | null = null
    if (context.type) {
      if (
        context.type instanceof Type &&
        context.type.spec instanceof EnumTypeSpec
      ) {
        if (context.type.spec.variants.size > 1 && context.definite) {
          context.err({
            type: ErrorType.ENUM_DESTRUCTURE_DEFINITE_MULT_VARIANTS,
            enum: context.type,
            variant: this.variant.value,
            otherVariants: [...context.type.spec.variants.keys()].filter(
              variant => variant !== this.variant.value,
            ),
          })
        }
        const variant = context.type.spec.variants.get(this.variant.value)
        if (variant) {
          if (variant.length !== this.patterns.length) {
            context.err({
              type: ErrorType.ENUM_DESTRUCTURE_FIELD_MISMATCH,
              enum: context.type,
              variant: this.variant.value,
              fields: variant.length,
              given: this.patterns.length,
            })
          }
          innerTypes = variant
        } else {
          context.err(
            {
              type: ErrorType.ENUM_DESTRUCTURE_NO_VARIANT,
              enum: context.type,
              variant: this.variant.value,
            },
            this.variant,
          )
        }
      } else {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: context.type,
          destructure: 'enum',
        })
      }
    }
    this.patterns.forEach((pattern, i) => {
      context.scope.checkPattern(
        pattern,
        innerTypes && innerTypes[i],
        context.definite,
      )
    })
    return {}
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
