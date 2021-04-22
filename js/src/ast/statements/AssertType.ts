import { ErrorType } from '../../type-checker/errors/Error'
import { expectEqual } from '../../type-checker/types/types'
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
    const errors = expectEqual(idealType, type)
    if (errors.length > 0) {
      context.err({
        type: ErrorType.TYPE_ASSERTION_FAIL,
        errors,
      })
    }
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
