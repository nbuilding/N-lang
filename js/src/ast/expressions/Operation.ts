import schema, * as schem from '../../utils/schema'
import { from } from '../../grammar/from-nearley'
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

export enum Operator {
  AND = 'and',
  OR = 'or',
  ADD = 'add',
  MINUS = 'minus',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
  MODULO = 'modulo',
  EXPONENT = 'exponent',
  PIPE = 'pipe',
}

export function operatorToString (self: Operator): string {
  switch (self) {
    case Operator.AND:
      return '&'
    case Operator.OR:
      return '|'
    case Operator.ADD:
      return '+'
    case Operator.MINUS:
      return '-'
    case Operator.MULTIPLY:
      return '*'
    case Operator.DIVIDE:
      return '/'
    case Operator.MODULO:
      return '%'
    case Operator.EXPONENT:
      return '^'
    case Operator.PIPE:
      return '|>'
  }
}

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
    throw new Error('Method not implemented.')
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return `(${this.a} ${operatorToString(this.type)} ${this.b})`
  }

  static operation<O extends Operator> (operator: O) {
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
