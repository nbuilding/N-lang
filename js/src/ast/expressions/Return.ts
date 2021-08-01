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
import { NType, unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'
import { cmd } from '../../type-checker/types/builtins'
import { attemptAssign } from '../../type-checker/types/comparisons/compare-assignable'
import { CompilationScope } from '../../compiler/CompilationScope'
import { isUnitLike } from '../../type-checker/types/isUnitLike'

export class Return extends Base implements Expression, Statement {
  value: Expression
  private _type?: NType

  /**
   * Whether the return expression returned a type that is actually the type
   * contained inside the cmd. For example, returning an int in a function that
   * should return cmd[int].
   */
  private _returnedContainedType = false

  constructor (
    pos: BasePosition,
    [, , expr]: schem.infer<typeof Return.schema>,
  ) {
    super(pos, [expr])
    this.value = expr
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this)
    return { exitPoint }
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    this._type = type
    const returnType = context.scope.getReturnType()
    if (returnType) {
      const error = attemptAssign(returnType, type)
      if (error) {
        if (returnType.type === 'named' && returnType.typeSpec === cmd) {
          context.isTypeError(
            ErrorType.RETURN_MISMATCH,
            returnType.typeVars[0],
            type,
          )
          this._returnedContainedType = true
        } else {
          context.err({ type: ErrorType.RETURN_MISMATCH, error })
        }
      }
    } else {
      context.err({
        type: ErrorType.RETURN_OUTSIDE_FUNCTION,
      })
    }
    return {
      type: unknown,
      exitPoint: exitPoint || this,
    }
  }

  compile (scope: CompilationScope): CompilationResult {
    const { statements, expression } = this.value.compile(scope)
    return {
      statements: [
        ...statements,
        scope.procedure
          ? isUnitLike(this._type!)
            ? `return ${scope.procedure.callbackName}();`
            : this._returnedContainedType
            ? `return ${scope.procedure.callbackName}(${expression});`
            : `return (${expression})(${scope.procedure.callbackName});`
          : isUnitLike(this._type!)
          ? 'return;'
          : `return ${expression};`,
      ],
      expression: 'undefined',
    }
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    return {
      statements: this.compile(scope).statements,
    }
  }

  toString (): string {
    return `return ${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.guard(isExpression),
  ])
}
