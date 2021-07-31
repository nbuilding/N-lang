import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import {
  CompilationResult,
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
import { iterateType, NType } from '../../type-checker/types/types'
import { CompilationScope } from '../../compiler/CompilationScope'
import { EnumSpec, AliasSpec } from '../../type-checker/types/TypeSpec'

// Ideally, there would be a more descriptive type error for this, like "^^^ I
// can't compare functions." One day!
function typeEqualable (testType: NType): boolean {
  for (const type of iterateType(testType)) {
    if (type.type === 'named') {
      if (type.typeSpec instanceof EnumSpec) {
        for (const [, types] of type.typeSpec.variants) {
          if (types.types && !types.types.every(typeEqualable)) {
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
function compareToJs (self: Compare): string {
  switch (self) {
    case Compare.LESS:
      return '<'
    case Compare.EQUAL:
      return '==='
    case Compare.GREATER:
      return '>'
    case Compare.LEQ:
      return '<='
    case Compare.NEQ:
      return '!=='
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
      const { type: typeB, exitPoint: exit } = context.scope.typeCheck(
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

  compile (scope: CompilationScope): CompilationResult {
    const { statements: aS, expression } = this.comparisons[0].a.compile(scope)
    if (this.comparisons.length === 1) {
      // No fancy short circuiting is needed
      const comparison = this.comparisons[0]
      const { statements: bS, expression: bE } = comparison.b.compile(scope)
      return {
        statements: [...aS, ...bS],
        expression:
          comparison.type === Compare.EQUAL || comparison.type === Compare.NEQ
            ? // TODO
              `${expression} ${compareToJs(comparison.type)} ${bE}`
            : `${expression} ${compareToJs(comparison.type)} ${bE}`,
      }
    } else {
      const last = scope.context.genVarName('compLeft')
      const next = scope.context.genVarName('compRight')
      const result = scope.context.genVarName('compResult')
      const statements = [...aS, `var ${last} = ${expression}, ${next};`]

      for (const comparison of this.comparisons) {
        const { statements: s, expression } = comparison.b.compile(scope)
        statements.push(
          ...s,
          `${next} = ${expression}`,
          comparison.type === Compare.EQUAL || comparison.type === Compare.NEQ
            ? // TODO
              `if (!(${last} ${compareToJs(comparison.type)} ${next})) break;`
            : `if (!(${last} ${compareToJs(comparison.type)} ${next})) break;`,
          `${last} = ${next};`,
        )
      }

      return {
        statements: [
          `var ${result} = false;`,
          'do {',
          ...scope.context.indent([...statements, `${result} = true;`]),
          '} while (false);',
        ],
        expression: result,
      }
    }
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
