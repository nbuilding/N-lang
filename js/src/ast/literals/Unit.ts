import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import {
  Expression,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression'

export class Unit extends Base implements Expression {
  constructor (pos: BasePosition, _: schem.infer<typeof Unit.schema>) {
    super(pos)
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return '()'
  }

  static schema = schema.tuple([schema.any, schema.any, schema.any])
}
