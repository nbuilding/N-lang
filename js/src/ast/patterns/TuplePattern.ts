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
    [patterns, pattern]: schem.infer<typeof TuplePattern.schema>,
  ) {
    super(pos)
    this.patterns = [...patterns.map(([pattern]) => pattern), pattern]
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    throw new Error('Method not implemented.')
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
