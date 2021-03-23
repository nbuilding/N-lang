import schema, * as schem from '../../utils/schema'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'
import { Condition, isCondition } from './condition'

export class IfExpression extends Base {
  condition: Condition
  then: Expression
  else: Expression

  constructor (
    pos: BasePosition,
    [, condition, , ifThen, , ifElse]: schem.infer<typeof IfExpression.schema>,
  ) {
    super(pos, [condition, ifThen, ifElse])
    this.condition = condition
    this.then = ifThen
    this.else = ifElse
  }

  toString () {
    return `if ${this.condition} { ${this.then} }`
      + (this.else ? ` else { ${this.else} }` : '')
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isCondition),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.guard(isExpression),
  ])
}
