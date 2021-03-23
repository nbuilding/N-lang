import schema, * as schem from '../../utils/schema'
import { from } from '../../grammar/from-nearley'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'

export enum UnaryOperator {
  NEGATE = 'negate',
  NOT = 'not',
  AWAIT = 'await',
}

export function unaryOperatorToString (self: UnaryOperator): string {
  switch (self) {
    case UnaryOperator.NEGATE: return 'negate'
    case UnaryOperator.NOT: return 'not'
    case UnaryOperator.AWAIT: return 'await'
  }
}

export class UnaryOperation<O extends UnaryOperator> extends Base {
  type: O
  value: Expression

  constructor (pos: BasePosition, operator: O, value: Expression) {
    super(pos, [value])
    this.type = operator
    this.value = value
  }

  toString () {
    switch (this.type) {
      case UnaryOperator.NEGATE: return `-${this.value}`
      case UnaryOperator.NOT: return `not ${this.value}`
      case UnaryOperator.AWAIT: return `${this.value}!`
    }
    return super.toString()
  }

  static prefix<O extends UnaryOperator> (operator: O) {
    const prefixSchema = schema.tuple([
      schema.any,
      schema.any,
      schema.guard(isExpression),
    ])
    function fromSchema (pos: BasePosition, [, , value]: schem.infer<typeof prefixSchema>): UnaryOperation<O> {
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
    function fromSchema (pos: BasePosition, [value]: schem.infer<typeof suffixSchema>): UnaryOperation<O> {
      return new UnaryOperation(pos, operator, value)
    }
    return from({ schema: suffixSchema, from: fromSchema })
  }
}

export class RecordAccess extends Base {
  value: Expression
  field: string

  constructor (
    pos: BasePosition,
    [value, , field]: schem.infer<typeof RecordAccess.schema>,
  ) {
    super(pos, [value])
    this.value = value
    this.field = field.value
  }

  toString () {
    return `${this.value}.${this.field}`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
    schema.any,
    schema.instance(Identifier),
  ])
}
