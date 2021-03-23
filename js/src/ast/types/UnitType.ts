import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Type } from './Type'

export class UnitType extends Base implements Type {
  constructor (pos: BasePosition, _: schem.infer<typeof UnitType.schema>) {
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
