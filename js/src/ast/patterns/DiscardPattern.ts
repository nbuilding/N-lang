import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { CheckPatternContext, CheckPatternResult, Pattern } from './Pattern'

export class DiscardPattern extends Base implements Pattern {
  constructor (pos: BasePosition, _: schem.infer<typeof DiscardPattern.schema>) {
    super(pos)
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return '_'
  }

  static schema = schema.tuple([
    schema.any,
  ])
}
