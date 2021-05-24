import schema, * as schem from '../../utils/schema'
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
import { AliasSpec, NType, unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'
import { callFunction } from '../../type-checker/types/comparisons/compare-assignable'

export class FuncCall extends Base implements Expression, Statement {
  func: Expression
  params: Expression[]

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
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    return { exitPoint }
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const funcResult = context.scope.typeCheck(this.func)
    let exitPoint = funcResult.exitPoint
    const paramTypes: [NType, Expression][] = this.params.map(param => {
      const paramExpr = context.scope.typeCheck(param)
      if (paramExpr.exitPoint && !exitPoint) {
        exitPoint = paramExpr.exitPoint
      }
      return [paramExpr.type, param]
    })
    let funcType = funcResult.type
    let argPos = 1
    for (const [param, base] of paramTypes) {
      funcType = AliasSpec.resolve(funcType)
      if (funcType.type === 'function') {
        const result = callFunction(funcType, param)
        if (result.error) {
          context.err(
            {
              type: ErrorType.ARG_TYPE_MISMATCH,
              error: result.error,
              argPos,
            },
            base,
          )
        }
        funcType = result.return
      } else {
        // Note: This might allow something like
        // testFunc : str -> t
        // testFunc("wow", "anyways", "wee", "too many arguments")
        // to go unnoticed
        if (funcType.type !== 'unknown') {
          if (argPos === 1) {
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
                argPos,
              },
              base,
            )
          }
        }
        return { type: unknown, exitPoint }
      }
      argPos++
    }
    return { type: funcType, exitPoint }
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
