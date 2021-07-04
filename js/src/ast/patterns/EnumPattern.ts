import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { EnumSpec, unknown } from '../../type-checker/types/types'
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
  type?: EnumSpec

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
      this.type = context.type.typeSpec
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
    const statements: string[] = []
    const varNames: string[] = []
    const {
      mangled: { [this.variant.value]: mangled },
      nullable,
    } = scope.context.normaliseEnum(this.type!)
    if (mangled) {
      this.patterns.forEach((pattern, i) => {
        const { statements: s, varNames: v } = pattern.compilePattern(
          scope,
          `${valueName}.${mangled[i]}`,
        )
        statements.push(...s)
        varNames.push(...v)
      })
    }
    return {
      statements: [
        mangled === null
          ? `if (!${valueName}) {`
          : `if (${nullable ? `${valueName} && ` : ''}'${
              mangled[0]
            }' in ${valueName}) {`,
        ...scope.context.indent(statements),
        '} else return false;',
      ],
      varNames,
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
