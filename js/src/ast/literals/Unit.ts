import { Unit as UnitType } from '../../type-checker/types/types'
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

  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: new UnitType() }
  }

  toString (): string {
    return '()'
  }

  static schema = schema.tuple([schema.any, schema.any, schema.any])
}
