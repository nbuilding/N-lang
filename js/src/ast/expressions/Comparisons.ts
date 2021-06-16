import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { bool, float, int } from '../../type-checker/types/builtins'
import { compareEqualTypes } from '../../type-checker/types/comparisons/compare-equal'
import { ErrorType } from '../../type-checker/errors/Error'
import { equalableTypes } from '../../type-checker/types/operations'
import { NType } from '../..'
import {
  AliasSpec,
  EnumSpec,
  iterateType,
} from '../../type-checker/types/types'

// Ideally, there would be a more descriptive type error for this, like "^^^ I
// can't compare functions." One day!
function typeEqualable (testType: NType): boolean {
  for (const type of iterateType(testType)) {
    if (type.type === 'named') {
      if (type.typeSpec instanceof EnumSpec) {
        for (const types of type.typeSpec.variants) {
          if (!types.every(typeEqualable)) {
            return false
          }
        }
      } else if (type.typeSpec instanceof AliasSpec) {
        if (!typeEqualable(type.typeSpec.substitute(type.typeVars))) {
          return false
        }
      } else {
        if (!equalableTypes.includes(type.typeSpec)) {
          return false
        }
      }
    } else if (type.type === 'function') {
      return false
    }
  }
  return true
}

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

export class Comparison {
  type: Compare
  a: Expression
  b: Expression

  constructor (type: Compare, a: Expression, b: Expression) {
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
    const bases: Base[] = []
    let lastExpr
    for (const comparisonOperatorPair of rawComparisons) {
      const [left, , operator] = comparisonOperatorPair
      if (lastExpr) {
        comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, left))
      }
      bases.push(left)
      lastExpr = {
        left,
        operator: operator.value,
      }
    }
    if (lastExpr) {
      comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, value))
    }
    bases.push(value)
    if (comparisons.length === 0) {
      console.log(rawComparisons)
      throw new TypeError('I should have at least one comparison!')
    }
    super(pos, bases)
    this.comparisons = comparisons
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    let { type, exitPoint } = context.scope.typeCheck(this.comparisons[0].a)
    for (const comparison of this.comparisons) {
      let { type: typeB, exitPoint: exit } = context.scope.typeCheck(
        comparison.b,
      )
      const result = compareEqualTypes([type, typeB])
      if (result.error) {
        context.err({
          type: ErrorType.COMPARISON_MISMATCH,
          error: result.error.result,
        })
      }
      type = typeB
      if (
        comparison.type === Compare.EQUAL ||
        comparison.type === Compare.NEQ
      ) {
        if (!typeEqualable(type)) {
          context.err({
            type: ErrorType.COMPARISON_CANNOT_EQUAL,
          })
        }
      } else {
        // Ideally, I wouldn't have to hard code these types
        if (
          !(
            (type.type === 'named' &&
              (type.typeSpec === float.typeSpec ||
                type.typeSpec === int.typeSpec)) ||
            (type.type === 'union' &&
              type.types.every(
                spec => spec === float.typeSpec || spec === int.typeSpec,
              ))
          )
        ) {
          context.err({
            type: ErrorType.COMPARISON_CANNOT_COMPARE,
          })
        }
      }
      if (!exitPoint) exitPoint = exit
    }
    return { type: bool, exitPoint }
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
