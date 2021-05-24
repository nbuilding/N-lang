import { ErrorType } from '../../type-checker/errors/Error'
import { unknown } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
} from './Pattern'

export class TuplePattern extends Base implements Pattern {
  patterns: Pattern[]

  constructor (
    pos: BasePosition,
    [rawPatterns, pattern]: schem.infer<typeof TuplePattern.schema>,
  ) {
    const patterns = [...rawPatterns.map(([pattern]) => pattern), pattern]
    super(pos, patterns)
    this.patterns = patterns
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    if (context.type.type === 'tuple') {
      if (context.type.types.length !== this.patterns.length) {
        context.err({
          type: ErrorType.TUPLE_DESTRUCTURE_LENGTH_MISMATCH,
          tuple: context.type,
          fields: context.type.types.length,
          given: this.patterns.length,
        })
      }
      const tupleTypes = context.type.types
      this.patterns.forEach((pattern, i) => {
        context.scope.checkPattern(
          pattern,
          tupleTypes[i] || unknown,
          context.definite,
        )
      })
    } else {
      if (context.type.type !== 'unknown') {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: context.type,
          destructure: 'tuple',
        })
      }
      for (const pattern of this.patterns) {
        context.scope.checkPattern(pattern, unknown, context.definite)
      }
    }
    return {}
  }

  toString (): string {
    return `(${this.patterns.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([schema.guard(isPattern), schema.any])),
    schema.guard(isPattern),
    schema.any,
  ])
}
