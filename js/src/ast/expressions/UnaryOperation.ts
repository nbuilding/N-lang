import schema, * as schem from '../../utils/schema'
import { from, Preprocessor } from '../../grammar/from-nearley'
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
import { unaryOperations } from '../../type-checker/types/operations'
import { tryFunctions } from '../../type-checker/types/comparisons/compare-assignable'
import { cmd } from '../../type-checker/types/builtins'
import { UnaryOperator } from '../../type-checker/types/operations/UnaryOperator'
import { ErrorType } from '../../type-checker/errors/Error'

export class UnaryOperation<O extends UnaryOperator> extends Base
  implements Expression, Statement {
  type: O
  value: Expression

  constructor (pos: BasePosition, operator: O, value: Expression) {
    super(pos, [value])
    this.type = operator
    this.value = value
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    if (this.type !== UnaryOperator.AWAIT) {
      throw new Error('Non-await operator should not be a statement')
    }
    return { exitPoint }
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    const operationType = tryFunctions(unaryOperations[this.type], [type])
    if (!operationType) {
      context.err({
        type: ErrorType.UNARY_OPERATION_UNPERFORMABLE,
        operand: type,
        operation: this.type,
      })
    }
    if (this.type === UnaryOperator.AWAIT) {
      const returnType = context.scope.getReturnType()
      if (
        !returnType ||
        returnType.type !== 'named' ||
        returnType.typeSpec !== cmd
      ) {
        context.err({
          type: ErrorType.AWAIT_OUTSIDE_CMD,
        })
      }
    }
    return { type: operationType || unknown, exitPoint }
  }

  toString (): string {
    switch (this.type) {
      case UnaryOperator.NEGATE:
        return `-${this.value}`
      case UnaryOperator.NOT:
        return `not ${this.value}`
      case UnaryOperator.AWAIT:
        return `${this.value}!`
    }
    return super.toString()
  }

  static prefix<O extends UnaryOperator> (
    operator: O,
  ): Preprocessor<UnaryOperation<O>> {
    const prefixSchema = schema.tuple([
      schema.any,
      schema.any,
      schema.guard(isExpression),
    ])
    function fromSchema (
      pos: BasePosition,
      [, , value]: schem.infer<typeof prefixSchema>,
    ): UnaryOperation<O> {
      return new UnaryOperation(pos, operator, value)
    }
    return from({ schema: prefixSchema, from: fromSchema })
  }

  static suffix<O extends UnaryOperator> (
    operator: O,
  ): Preprocessor<UnaryOperation<O>> {
    const suffixSchema = schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.any,
    ])
    function fromSchema (
      pos: BasePosition,
      [value]: schem.infer<typeof suffixSchema>,
    ): UnaryOperation<O> {
      return new UnaryOperation(pos, operator, value)
    }
    return from({ schema: suffixSchema, from: fromSchema })
  }
}
