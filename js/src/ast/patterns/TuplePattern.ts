import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { isPattern, Pattern } from './Pattern'

export class TuplePattern extends Base implements Pattern {
  patterns: Pattern[]

  constructor (pos: BasePosition, [patterns, pattern]: schem.infer<typeof TuplePattern.schema>) {
    super(pos)
    this.patterns = [
      ...patterns.map(([pattern]) => pattern),
      pattern,
    ]
  }

  toString () {
    return `(${this.patterns.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isPattern),
      schema.any,
    ])),
    schema.guard(isPattern),
    schema.any,
  ])
}
