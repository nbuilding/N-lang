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

export enum UnaryOperator {
  NEGATE = 'negate',
  NOT = 'not',
  AWAIT = 'await',
}

export function unaryOperatorToString (self: UnaryOperator): string {
  switch (self) {
    case UnaryOperator.NEGATE:
      return 'negate'
    case UnaryOperator.NOT:
      return 'not'
    case UnaryOperator.AWAIT:
      return 'await'
  }
}

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
    throw new Error('Method not implemented.')
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }

  toString () {
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

  static prefix<O extends UnaryOperator> (operator: O) {
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

  static suffix<O extends UnaryOperator> (operator: O) {
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
