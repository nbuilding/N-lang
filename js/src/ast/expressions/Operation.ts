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
import { tryFunctions } from '../../type-checker/types/comparisons/compare-assignable'
import { operations } from '../../type-checker/types/operations'
import { unknown } from '../../type-checker/types/types'
import {
  Operator,
  operatorToString,
} from '../../type-checker/types/operations/Operator'
import { ErrorType } from '../../type-checker/errors/Error'

export class Operation<O extends Operator> extends Base
  implements Expression, Statement {
  type: O
  a: Expression
  b: Expression

  constructor (
    pos: BasePosition,
    operator: O,
    expr: Expression,
    val: Expression,
  ) {
    super(pos, [expr, val])
    this.type = operator
    this.a = expr
    this.b = val
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    if (this.type !== Operator.PIPE) {
      throw new Error('Non-pipe operator should not be a statement')
    }
    return { exitPoint }
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { type: typeA, exitPoint: exitA } = context.scope.typeCheck(this.a)
    const { type: typeB, exitPoint: exitB } = context.scope.typeCheck(this.b)
    const operationType = tryFunctions(operations[this.type], [typeA, typeB])
    if (!operationType) {
      context.err({
        type: ErrorType.OPERATION_UNPERFORMABLE,
        a: typeA,
        b: typeB,
        operation: this.type,
      })
    }
    return { type: operationType || unknown, exitPoint: exitA || exitB }
  }

  toString (): string {
    return `(${this.a} ${operatorToString(this.type)} ${this.b})`
  }

  static operation<O extends Operator> (
    operator: O,
  ): Preprocessor<Operation<O>> {
    const opSchema = schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.any,
      schema.any,
      schema.guard(isExpression),
    ])
    function fromSchema (
      pos: BasePosition,
      [expr, , , , val]: schem.infer<typeof opSchema>,
    ): Operation<O> {
      return new Operation(pos, operator, expr, val)
    }
    return from({ schema: opSchema, from: fromSchema })
  }
}
