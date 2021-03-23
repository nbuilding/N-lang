import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { GetTypeContext, GetTypeResult, Type } from './Type'

export class UnitType extends Base implements Type {
  constructor (pos: BasePosition, _: schem.infer<typeof UnitType.schema>) {
    super(pos)
  }

  getType (context: GetTypeContext): GetTypeResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return '()'
  }

  static schema = schema.tuple([schema.any, schema.any, schema.any])
}
