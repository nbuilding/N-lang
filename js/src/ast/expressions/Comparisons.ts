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
import {
  bool,
  cmd,
  float,
  int,
  list,
  map,
} from '../../type-checker/types/builtins'
import { compareEqualTypes } from '../../type-checker/types/comparisons/compare-equal'
import { ErrorType } from '../../type-checker/errors/Error'
import { iterateType, NType } from '../../type-checker/types/types'
import { CompilationScope } from '../../compiler/CompilationScope'
import {
  EnumSpec,
  AliasSpec,
  FuncTypeVarSpec,
} from '../../type-checker/types/TypeSpec'
import { isUnitLike } from '../../type-checker/types/isUnitLike'

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
        if (type.typeSpec === cmd) {
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
  private _type?: NType

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
    this._type = type
    return { type: bool, exitPoint }
  }

  private _compileEqual (
    scope: CompilationScope,
    a: string,
    b: string,
    type: NType,
    equal: boolean,
  ): string {
    const operator = equal ? '===' : '!=='
    const conjunction = equal ? '&&' : '||'
    if (isUnitLike(type)) {
      return 'true'
    } else if (type.type === 'union') {
      // Probably a number type
      return `${a} ${operator} ${b}`
    } else if (type.type === 'tuple') {
      return type.types
        .map((type, i) =>
          this._compileEqual(scope, `${a}[${i}]`, `${b}[${i}]`, type, equal),
        )
        .join(` ${conjunction} `)
    } else if (type.type === 'record') {
      const mangledKeys = scope.context.normaliseRecord(type)
      return Array.from(type.types, ([key, type]) =>
        this._compileEqual(
          scope,
          `${a}.${mangledKeys[key]}`,
          `${b}.${mangledKeys[key]}`,
          type,
          equal,
        ),
      ).join(` ${conjunction} `)
    } else if (type.type === 'named') {
      if (type.typeSpec instanceof EnumSpec) {
        const representation = type.typeSpec.representation
        switch (representation.type) {
          case 'unit': {
            return 'true'
          }
          case 'bool':
          case 'union':
          case 'maybe': {
            return `${a} ${operator} ${b}`
          }
          case 'tuple': {
            const nonNullVariant = type.typeSpec.variants.get(
              representation.nonNull,
            )
            if (!nonNullVariant || !nonNullVariant.types) {
              throw new Error(
                `What happened to the ${representation.nonNull} variant?`,
              )
            }
            const tupleComp = nonNullVariant.types
              .map((type, i) =>
                this._compileEqual(
                  scope,
                  `${a}[${i}]`,
                  `${b}[${i}]`,
                  type,
                  equal,
                ),
              )
              .join(` ${conjunction} `)
            if (representation.null) {
              return `(${a} ${conjunction} ${b} ? ${tupleComp} : ${a} ${operator} ${b})`
            } else {
              return tupleComp
            }
          }
          default: {
            // It's easier to use deepEqual at this point lol
            const deepComp = `${equal ? '' : '!'}${
              scope.context.require('deepEqual')
            }(${a}, ${b})`
            if (representation.nullable) {
              return `(${a} ${conjunction} ${b} ? ${deepComp} : ${a} ${operator} ${b})`
            } else {
              return deepComp
            }
          }
        }
      } else if (type.typeSpec instanceof FuncTypeVarSpec) {
        return `${equal ? '' : '!'}${
          scope.context.require('deepEqual')
        }(${a}, ${b})`
      } else if (type.typeSpec === list) {
        return `${a}.length ${operator} ${b}.length ${conjunction} ${a}.every(function (item, i) { return ${this._compileEqual(
          scope,
          'item',
          `${b}[i]`,
          type.typeVars[0],
          equal,
        )} })`
      } else if (type.typeSpec === map) {
        throw new Error("I haven't figured out maps yet")
      } else {
        return `${a} ${operator} ${b}`
      }
    } else {
      throw new Error('What is a function/unknown doing here?')
    }
  }

  compile (scope: CompilationScope): CompilationResult {
    const { statements: aS, expression } = this.comparisons[0].a.compile(scope)
    if (this.comparisons.length === 1) {
      // No fancy short circuiting is needed
      const comparison = this.comparisons[0]
      const { statements: bS, expression: bE } = comparison.b.compile(scope)
      const a = scope.context.genVarName('compA')
      const b = scope.context.genVarName('compB')
      return {
        statements: [...aS, ...bS, `var ${a} = ${expression}, ${b} = ${bE};`],
        expression:
          comparison.type === Compare.EQUAL || comparison.type === Compare.NEQ
            ? this._compileEqual(
                scope,
                a,
                b,
                this._type!,
                comparison.type === Compare.EQUAL,
              )
            : `${a} ${compareToJs(comparison.type)} ${b}`,
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
            ? `if (!(${this._compileEqual(
                scope,
                last,
                next,
                this._type!,
                comparison.type === Compare.EQUAL,
              )})) break;`
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
