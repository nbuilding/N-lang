import schema, * as schem from '../../utils/schema'
import {
  CompilationResult,
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
  StatementCompilationResult,
} from '../statements/Statement'
import { AliasSpec, NType, unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'
import { callFunction } from '../../type-checker/types/comparisons/compare-assignable'
import { isUnit, unit } from '../../type-checker/types/builtins'
import { CompilationScope } from '../../compiler/CompilationScope'

export class FuncCall extends Base implements Expression, Statement {
  func: Expression
  params: Expression[]
  private _paramTypes: NType[]

  constructor (
    pos: BasePosition,
    [func, , maybeParams]: schem.infer<typeof FuncCall.schema>,
  ) {
    const params = maybeParams
      ? [...maybeParams[0].map(([param]) => param), maybeParams[1]]
      : []
    super(pos, [func, ...params])
    this.func = func
    this.params = params
    this._paramTypes = []
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    return { exitPoint }
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const funcResult = context.scope.typeCheck(this.func)
    let exitPoint = funcResult.exitPoint
    let returnType: NType | null = funcResult.type
    // Check for extra arguments at this step to be able to detect extra
    // arguments for [t] str -> t
    const paramTypes: [NType, Expression][] = this.params.map((param, i) => {
      if (returnType) {
        returnType = AliasSpec.resolve(returnType)
        if (returnType.type === 'function') {
          returnType = returnType.return
        } else if (returnType.type !== 'unknown') {
          if (i === 0) {
            context.err(
              {
                type: ErrorType.CALL_NON_FUNCTION,
                funcType,
              },
              this.func,
            )
          } else {
            context.err(
              {
                type: ErrorType.TOO_MANY_ARGS,
                funcType,
                argPos: i + 1,
              },
              param,
            )
          }
          returnType = null
        }
      }

      const paramExpr = context.scope.typeCheck(param)
      if (paramExpr.exitPoint && !exitPoint) {
        exitPoint = paramExpr.exitPoint
      }
      this._paramTypes[i] = paramExpr.type
      return [paramExpr.type, param]
    })
    if (paramTypes.length === 0) {
      paramTypes.push([unit, this])
    }

    let funcType = funcResult.type
    let argPos = 1
    for (const [param, base] of paramTypes) {
      funcType = AliasSpec.resolve(funcType)
      if (funcType.type === 'function') {
        const result = callFunction(funcType, param)
        if (result.error) {
          context.err(
            {
              type: ErrorType.ARG_MISMATCH,
              error: result.error,
              argPos,
            },
            base,
          )
        }
        funcType = result.return
      } else {
        return { type: unknown, exitPoint }
      }
      argPos++
    }
    return { type: funcType, exitPoint }
  }

  compile (scope: CompilationScope): CompilationResult {
    const { statements: funcS, expression } = this.func.compile(scope)
    const statements = [...funcS]
    // To support currying, functions with multiple arguments are called like
    // func(arg1)(arg2)(arg3), but that might lose out on some browser
    // optimisations.
    const params: string[] = []
    if (this.params.length > 0) {
      this.params.forEach((param, i) => {
        if (isUnit(this._paramTypes[i])) {
          params.push('()')
        } else {
          const { statements: s, expression } = param.compile(scope)
          statements.push(...s)
          params.push(`(${expression})`)
        }
      })
    } else {
      params.push('()')
    }
    return {
      statements,
      expression: `(${expression})${params.join('')}`,
    }
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    // TODO: An option to optimise these away
    const { statements, expression } = this.compile(scope)
    return {
      statements: [...statements, expression + ';'],
    }
  }

  toString (): string {
    return `${this.func}(${this.params.join(', ')})`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(schema.tuple([schema.guard(isExpression), schema.any])),
        schema.guard(isExpression),
        schema.any,
      ]),
    ),
    schema.any,
  ])
}
