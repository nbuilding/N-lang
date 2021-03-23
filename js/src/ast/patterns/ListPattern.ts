import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { isPattern, Pattern } from './Pattern'

export class ListPattern extends Base implements Pattern {
  patterns: Pattern[]

  constructor (pos: BasePosition, [, patterns]: schem.infer<typeof ListPattern.schema>) {
    super(pos)
    this.patterns = patterns ? [
      ...patterns[0].map(([pattern]) => pattern),
      patterns[1],
    ] : []
  }

  toString () {
    return `[${this.patterns.join(', ')}]`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.guard(isPattern),
        schema.any,
      ])),
      schema.guard(isPattern),
      schema.any,
    ])),
    schema.any,
  ])
}
