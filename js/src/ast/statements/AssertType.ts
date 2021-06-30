import { ErrorType } from '../../type-checker/errors/Error'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Expression, isExpression } from '../expressions/Expression'
import { isType, Type } from '../types/Type'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class AssertType extends Base implements Statement {
  expression: Expression
  type: Type

  constructor (
    pos: BasePosition,
    [, expression, , type]: schem.infer<typeof AssertType.schema>,
  ) {
    super(pos, [expression, type])
    this.expression = expression
    this.type = type
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { type, exitPoint } = context.scope.typeCheck(this.expression)
    const idealType = context.scope.getTypeFrom(this.type).type
    context.isTypeError(ErrorType.TYPE_ASSERTION_FAIL, idealType, type)
    return { exitPoint }
  }

  toString (): string {
    return `assert type ${this.expression} : ${this.type}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.guard(isType),
  ])
}
