import { ErrorType } from '../../type-checker/errors/Error'
import { list } from '../../type-checker/types/builtins'
import { NType, Type } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
} from './Pattern'

export class ListPattern extends Base implements Pattern {
  patterns: Pattern[]

  constructor (
    pos: BasePosition,
    [, rawPatterns]: schem.infer<typeof ListPattern.schema>,
  ) {
    const patterns = rawPatterns
      ? [...rawPatterns[0].map(([pattern]) => pattern), rawPatterns[1]]
      : []
    super(pos, patterns)
    this.patterns = patterns
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    let innerType: NType | null = null
    if (context.type) {
      if (context.type instanceof Type && context.type.spec === list) {
        innerType = context.type.typeVars[0]
      } else {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: context.type,
          destructure: 'list',
        })
      }
    }
    if (context.definite) {
      context.err({ type: ErrorType.LIST_DESTRUCTURE_DEFINITE })
    }
    for (const pattern of this.patterns) {
      context.scope.checkPattern(pattern, innerType, context.definite)
    }
    return {}
  }

  toString (): string {
    return `[${this.patterns.join(', ')}]`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(schema.tuple([schema.guard(isPattern), schema.any])),
        schema.guard(isPattern),
        schema.any,
      ]),
    ),
    schema.any,
  ])
}
