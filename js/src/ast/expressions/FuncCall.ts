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
import {
  resolve,
  Function as FuncType,
  NType,
} from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'

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
    const funcExpr = context.scope.typeCheck(this.func)
    let exitPoint = funcExpr.exitPoint
    const paramTypes: [NType | null, Expression][] = this.params.map(param => {
      const paramExpr = context.scope.typeCheck(param)
      if (paramExpr.exitPoint && !exitPoint) {
        exitPoint = paramExpr.exitPoint
      }
      return [paramExpr.type, param]
    })
    if (funcExpr.type) {
      const resolvedFuncType = resolve(funcExpr.type)
      if (resolvedFuncType instanceof FuncType) {
        let returnType: NType = resolvedFuncType
        let argPos = 1
        for (const [paramType, param] of paramTypes) {
          if (returnType instanceof FuncType) {
            if (!paramType) {
              // If param type is the error type, use the return type of the
              // function if it can be known.
              if (returnType.generics.length === 0) {
                returnType = returnType.returns
                continue
              } else {
                // If the function has generics, we might not be able to
                // properly determine the return type.
                // Example: ([t] t -> t)(null) null may not be equal to t.
                // Maybe this could be improved in the future
                return { type: null, exitPoint }
              }
            }
            const result = returnType.returnTypeFromParam(paramType)
            if (result.paramTypeIncompatible && paramType !== null) {
              context.err(
                {
                  type: ErrorType.ARG_TYPE_MISMATCH,
                  funcType: resolvedFuncType,
                  expect: returnType.takes,
                  given: paramType,
                  argPos,
                },
                param,
              )
              // Do not exit because the return type of the function still might
              // be known
            }
            if (result.type === 'unresolved-generic') {
              context.err({
                type: ErrorType.UNRESOLVED_GENERIC,
                funcType: resolvedFuncType,
              })
              return { type: null, exitPoint }
            } else {
              returnType = result.type
            }
          } else {
            context.err(
              {
                type: ErrorType.TOO_MANY_ARGS,
                funcType: resolvedFuncType,
                argPos,
              },
              param,
            )
            return { type: null, exitPoint }
          }
          argPos++
        }
        return {
          type: returnType,
          exitPoint,
        }
      } else {
        context.err(
          {
            type: ErrorType.CALL_NON_FUNCTION,
            funcType: resolvedFuncType,
          },
          this.func,
        )
      }
    }
    return { type: null, exitPoint }
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
