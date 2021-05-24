import schema, * as schem from '../../utils/schema'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { Condition, isCondition } from '../condition/Condition'
import { compareEqualTypes } from '../../type-checker/types/comparisons/compare-equal'
import { unknown } from '../../type-checker/types/types'

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
    // TODO: Unify condition to avoid repetition
    const { type: condType, exitPoint: condExit } = context.scope.typeCheck(
      this.condition,
    )
    const { type: thenType, exitPoint: thenExit } = context.scope.typeCheck(
      this.then,
    )
    const { type: elseType, exitPoint: elseExit } = context.scope.typeCheck(
      this.else,
    )
    const exitPoint = condExit || thenExit || elseExit
    const result = compareEqualTypes([thenType, elseType])
    if (result.errorIndex === null) {
      return { type: result.result, exitPoint }
    } else {
      // TODO: Error
      return { type: unknown, exitPoint }
    }
  }

  toString (): string {
    return (
      `if ${this.condition} { ${this.then} }` +
      (this.else ? ` else { ${this.else} }` : '')
    )
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
