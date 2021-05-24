import { ErrorType } from '../../type-checker/errors/Error'
import { AliasSpec, unknown } from '../../type-checker/types/types'
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
    const resolved = AliasSpec.resolve(context.type)
    if (resolved.type === 'tuple') {
      if (resolved.types.length !== this.patterns.length) {
        context.err({
          type: ErrorType.TUPLE_DESTRUCTURE_LENGTH_MISMATCH,
          tuple: resolved,
          fields: resolved.types.length,
          given: this.patterns.length,
        })
      }
      const tupleTypes = resolved.types
      this.patterns.forEach((pattern, i) => {
        context.checkPattern(pattern, tupleTypes[i] || unknown)
      })
    } else {
      if (resolved.type !== 'unknown') {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: resolved,
          destructure: 'tuple',
        })
      }
      for (const pattern of this.patterns) {
        context.checkPattern(pattern, unknown)
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
