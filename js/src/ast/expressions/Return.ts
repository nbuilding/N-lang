import schema, * as schem from '../../utils/schema'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'

export class Return extends Base implements Expression {
  value: Expression

  constructor (pos: BasePosition, [, , expr]: schem.infer<typeof Return.schema>) {
    super(pos, [expr])
    this.value = expr
  }

  toString () {
    return `return ${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.guard(isExpression),
  ])
}
