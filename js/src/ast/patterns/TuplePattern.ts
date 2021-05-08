import { ErrorType } from '../../type-checker/errors/Error'
import { NType, Tuple } from '../../type-checker/types/types'
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
    let types: (NType | null)[] | null = null
    if (context.type) {
      if (context.type instanceof Tuple) {
        if (context.type.types.length !== this.patterns.length) {
          context.err({
            type: ErrorType.TUPLE_DESTRUCTURE_LENGTH_MISMATCH,
            tuple: context.type,
            fields: context.type.types.length,
            given: this.patterns.length,
          })
        }
        types = context.type.types
      } else {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: context.type,
          destructure: 'tuple',
        })
      }
    }
    this.patterns.forEach((pattern, i) => {
      context.scope.checkPattern(pattern, types && types[i], context.definite)
    })
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
