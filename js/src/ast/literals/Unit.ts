import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'

export class Unit extends Base {
  constructor (pos: BasePosition, _: schem.infer<typeof Unit.schema>) {
    super(pos)
  }

  toString () {
    return '()'
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.any,
  ])
}
