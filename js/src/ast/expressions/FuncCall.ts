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
import {
  NFunction,
  NType,
  NTypeKnown,
  unknown,
} from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'
import { callFunction } from '../../type-checker/types/comparisons/compare-assignable'
import { unit } from '../../type-checker/types/builtins'
import { CompilationScope } from '../../compiler/CompilationScope'
import { isUnitLike } from '../../type-checker/types/isUnitLike'
import { AliasSpec, FuncTypeVarSpec } from '../../type-checker/types/TypeSpec'
import { isNullableMaybe } from '../../compiler/EnumRepresentation'
import { Spread } from './Spread'

export class FuncCall extends Base implements Expression, Statement {
  func: Expression
  params: Expression[]
  private _isTrait: boolean
  private _paramTypes: NType[]
  private _substitutions: Map<FuncTypeVarSpec, NTypeKnown>[]
  /**
   * A list of function types containing all the remaining arguments. Contains
   * the unsubstituted (unresolved) function argument types, which may include
   * the type variables.
   */
  private _funcTypes: NFunction[]

  constructor(
    pos: BasePosition,
    [func, , maybeParams]: schem.infer<typeof FuncCall.schema>,
  ) {
    const params = maybeParams
      ? [...maybeParams[0].map(([param]) => param), maybeParams[1]]
      : []
    super(pos, [func, ...params])
    this.func = func
    this.params = params
    this._isTrait = false
    this._paramTypes = []
    this._substitutions = []
    this._funcTypes = []
  }

  checkStatement(context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    return { exitPoint }
  }

  typeCheck(context: TypeCheckContext): TypeCheckResult {
    const funcResult = context.scope.typeCheck(this.func)
    let exitPoint = funcResult.exitPoint
    let returnType: NType | null = funcResult.type
    if (returnType.type === 'function') {
      this._isTrait = returnType.trait
    }
    // Check for extra arguments at this step to be able to detect extra
    // arguments for [t] str -> t
    // 
    // Also check for spread arguments, and denote them if they are present
    const paramTypes: [NType, Expression, boolean][] = this.params.map((param, i) => {
      const paramExpr = context.scope.typeCheck(param)

      const vals = param instanceof Spread && paramExpr.type.type === 'tuple' ? paramExpr.type.types  : [param]
      if (param instanceof Spread && paramExpr.type.type !== 'tuple') {
        context.err(
          {
            type: ErrorType.UNALLOWED_SPREAD,
          }
        )
      }
      for (const _ of vals) {
        if (returnType) {
          returnType = AliasSpec.resolve(returnType)
          if (returnType.type === 'function') {
            returnType = returnType.return
          } else if (returnType.type !== 'unknown') {
            if (i === 0) {
              context.err(
                {
                  type: ErrorType.CALL_NON_FUNCTION,
                  funcType: returnType,
                },
                this.func,
              )
            } else {
              context.err(
                {
                  type: ErrorType.TOO_MANY_ARGS,
                  funcType: returnType,
                  argPos: i + 1,
                },
                param,
              )
            }
            returnType = null
          }
        }
      }

      if (paramExpr.exitPoint && !exitPoint) {
        exitPoint = paramExpr.exitPoint
      }
      this._paramTypes[i] = paramExpr.type
      return [paramExpr.type, param, param instanceof Spread]
    })
    if (!returnType) {
      return { type: unknown, exitPoint }
    }
    if (paramTypes.length === 0) {
      paramTypes.push([unit, this, false])
    }

    let funcType = funcResult.type
    let argPos = 1
    for (const [param, base, spread] of paramTypes) {
      funcType = AliasSpec.resolve(funcType)
      if (funcType.type === 'function') {
        const argumentTypes = spread && param.type === 'tuple' ? param.types : [param]
        for (const t of argumentTypes) {
          if (funcType.type !== 'function' ){
            throw new Error('Unexpected tuple size')
          }
          this._funcTypes[argPos - 1] = funcType
          const result = callFunction(funcType, t)
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
          this._substitutions[argPos - 1] = result.typeVarSubstitutions
        }
      } else {
        return { type: unknown, exitPoint }
      }
      argPos++
    }
    return { type: funcType, exitPoint }
  }

  compile(scope: CompilationScope): CompilationResult {
    const { statements: funcS, expression: funcE } = this.func.compile(scope)
    const statements = [...funcS]
    let expression = `(${funcE})`
    // To support currying, functions with multiple arguments are called like
    // func(arg1)(arg2)(arg3), but that might lose out on some browser
    // optimisations.
    if (this.params.length > 0) {
      this.params.forEach((param, i) => {
        // Keep only FTV resolutions to unit-like values
        const substitutions = [...this._substitutions[i]].filter(
          ([, type]) => isUnitLike(type) || isNullableMaybe(type),
        )
        if (substitutions.length > 0) {
          const args: [string, NType][] = []
          let funcType: NType = this._funcTypes[i]
          while (funcType.type === 'function') {
            args.push([scope.context.genVarName('arg'), funcType.argument])

            funcType = funcType.return
          }
          const returnType = funcType
          // Create a function that receives each argument and then transforms
          // it to/from a FTV
          const transform = scope.context.genVarName('transform')
          const funcExpr = scope.context.genVarName('funcExpr')
          const returnWithTypeVars = scope.context.genVarName('return')
          statements.push(
            `var ${funcExpr} = ${expression};`,
            ...scope.functionExpression(
              args.map(([argName, argType]) => ({
                argName: isUnitLike(argType) ? '' : argName,
                statements: [],
              })),
              scope => [
                `var ${returnWithTypeVars} = ${funcExpr}${args
                  .map(
                    ([argName, argType]) =>
                      `(${scope.context.makeUnitConverter(
                        argName,
                        argType,
                        this._substitutions[i],
                        true,
                      )?.expression ?? argName})`,
                  )
                  .join('')};`,
                `return ${scope.context.makeUnitConverter(
                  returnWithTypeVars,
                  returnType,
                  this._substitutions[i],
                  false,
                )?.expression ?? returnWithTypeVars};`,
              ],
              `var ${transform} = `,
              ';',
            ),
          )
          expression = transform
        }
        if (isUnitLike(this._paramTypes[i])) {
          expression += '()'
        } else {
          const { statements: s, expression: e } = param.compile(scope)
          statements.push(...s)
          expression += `(${param instanceof Spread ? '...' : ''}${e})`
        }
      })
    } else if (!this._isTrait) {
      expression += '()'
    }
    return {
      statements,
      expression,
    }
  }

  compileStatement(scope: CompilationScope): StatementCompilationResult {
    // TODO: An option to optimise these away
    const { statements, expression } = this.compile(scope)
    return {
      statements: [...statements, expression + ';'],
    }
  }

  toString(): string {
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
