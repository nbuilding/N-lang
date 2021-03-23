import schema, * as schem from '../../utils/schema'
import { Expression, isExpression, TypeCheckContext, TypeCheckResult } from './Expression'
import { Base, BasePosition } from '../base'
import { Condition, isCondition } from '../condition/Condition'

export class IfExpression extends Base implements Expression {
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

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
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
