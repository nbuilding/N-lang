import { ErrorType } from '../../type-checker/errors/Error'
import { bool } from '../../type-checker/types/builtins'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Expression, isExpression } from '../expressions/Expression'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class AssertValue extends Base implements Statement {
  expression: Expression

  constructor (
    pos: BasePosition,
    [, expression]: schem.infer<typeof AssertValue.schema>,
  ) {
    super(pos, [expression])
    this.expression = expression
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { type, exitPoint } = context.scope.typeCheck(this.expression)
    context.isTypeError(ErrorType.VALUE_ASSERTION_NOT_BOOL, bool, type)
    return { exitPoint }
  }

  toString (): string {
    return `assert value ${this.expression}`
  }

  static schema = schema.tuple([schema.any, schema.guard(isExpression)])
}
