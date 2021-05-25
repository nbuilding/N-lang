import schema, * as schem from '../../utils/schema'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from '../statements/Statement'
import { unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'

export class Return extends Base implements Expression, Statement {
  value: Expression

  constructor (
    pos: BasePosition,
    [, , expr]: schem.infer<typeof Return.schema>,
  ) {
    super(pos, [expr])
    this.value = expr
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    return { exitPoint }
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    const returnType = context.scope.getReturnType()
    if (returnType) {
      context.isTypeError(ErrorType.RETURN_MISMATCH, returnType, type)
    } else {
      context.err({
        type: ErrorType.RETURN_OUTSIDE_FUNCTION,
      })
    }
    return {
      type: unknown,
      exitPoint: exitPoint || this,
    }
  }

  toString (): string {
    return `return ${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.guard(isExpression),
  ])
}
