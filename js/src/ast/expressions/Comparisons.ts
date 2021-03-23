import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'

export enum Compare {
  LESS = 'less',
  EQUAL = 'equal',
  GREATER = 'greater',
  LEQ = 'less-or-equal',
  NEQ = 'not-equal',
  GEQ = 'greater-or-equal',
}
function compareToString (self: Compare): string {
  switch (self) {
    case Compare.LESS:
      return '<'
    case Compare.EQUAL:
      return '='
    case Compare.GREATER:
      return '>'
    case Compare.LEQ:
      return '<='
    case Compare.NEQ:
      return '/='
    case Compare.GEQ:
      return '>='
  }
}

export class Comparison extends Base {
  type: Compare
  a: Expression
  b: Expression

  constructor (type: Compare, a: Expression, b: Expression) {
    super(
      {
        line: a.line,
        col: a.col,
        endLine: b.endLine,
        endCol: b.endCol,
      },
      [a, b],
    )
    this.type = type
    this.a = a
    this.b = b
  }
}

export class Comparisons extends Base implements Expression {
  comparisons: Comparison[]

  constructor (
    pos: BasePosition,
    [rawComparisons, value]: schem.infer<typeof Comparisons.schema>,
  ) {
    const comparisons: Comparison[] = []
    let lastExpr
    for (const comparisonOperatorPair of rawComparisons) {
      const [left, , operator] = comparisonOperatorPair
      if (lastExpr) {
        comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, left))
      }
      lastExpr = {
        left,
        operator: operator.value,
      }
    }
    if (lastExpr) {
      comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, value))
    }
    if (comparisons.length === 0) {
      console.log(rawComparisons)
      throw new TypeError('I should have at least one comparison!')
    }
    super(pos, comparisons)
    this.comparisons = comparisons
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }

  toString (): string {
    let str = `${this.comparisons[0].a}`
    for (const { type, b } of this.comparisons) {
      str += ` ${compareToString(type)} ${b}`
    }
    return `(${str})`
  }

  static schema = schema.tuple([
    schema.array(
      schema.tuple([
        schema.guard(isExpression),
        schema.any,
        schema.guard((value: unknown): value is moo.Token & {
          value: Compare
        } => {
          return isToken(value) && isEnum(Compare)(value.value)
        }),
        schema.any,
      ]),
    ),
    schema.guard(isExpression),
  ])
}
