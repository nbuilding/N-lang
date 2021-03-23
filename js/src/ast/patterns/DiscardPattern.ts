import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'

export class DiscardPattern extends Base implements Pattern {
  constructor (pos: BasePosition, _: schem.infer<typeof DiscardPattern.schema>) {
    super(pos)
  }

  toString () {
    return '_'
  }

  static schema = schema.tuple([
    schema.any,
  ])
}
