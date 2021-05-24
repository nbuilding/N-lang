import { Base, Declaration } from '../ast/index'
import {
  Expression,
  TypeCheckContext,
  TypeCheckResult,
} from '../ast/expressions/Expression'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from '../ast/statements/Statement'
import { ErrorMessage, ErrorType, TypeErrorType } from './errors/Error'
import { WarningMessage } from './errors/Warning'
import { TypeCheckerResult } from './TypeChecker'
import { NType, TypeSpec, unknown } from './types/types'
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
} from '../ast/patterns/Pattern'
import { GetTypeContext, GetTypeResult, Type } from '../ast/types/Type'
import { displayType } from '../utils/display-type'
import { attemptAssign } from './types/comparisons/compare-assignable'

export class ScopeBaseContext {
  scope: Scope
  private _defaultBase: Base

  constructor (scope: Scope, base: Base) {
    this.scope = scope
    this._defaultBase = base
  }

  err (error: ErrorMessage, base: Base = this._defaultBase) {
    this.scope.checker.errors.push({ message: error, base })
  }

  warn (warning: WarningMessage, base: Base = this._defaultBase) {
    this.scope.checker.warnings.push({ message: warning, base })
  }

  /**
   * IMPURE! Creates a type error if an assignment cannot be performed between
   * the annotation and value types. Returns whether there was an error.
   */
  isTypeError (
    errorType: TypeErrorType,
    annotationType: NType,
    valueType: NType,
    base?: Base,
  ): boolean {
    const error = attemptAssign(annotationType, valueType)
    if (error) {
      this.err({ type: errorType, error }, base)
      return true
    } else {
      return false
    }
  }
}

export class Scope {
  checker: TypeCheckerResult
  parent?: Scope
  returnType?: NType
  variables: Map<string, NType> = new Map()
  types: Map<string, TypeSpec | null> = new Map()
  unusedVariables: Set<string> = new Set()
  unusedTypes: Set<string> = new Set()

  constructor (checker: TypeCheckerResult, parent?: Scope, returnType?: NType) {
    this.checker = checker
    this.parent = parent
    this.returnType = returnType
  }

  inner (returnType?: NType) {
    return new Scope(this.checker, this, returnType)
  }

  getReturnType (): NType | undefined {
    if (this.returnType) {
      return this.returnType
    } else if (this.parent) {
      return this.parent.getReturnType()
    } else {
      return undefined
    }
  }

  getVariable (name: string, markAsUsed: boolean): NType | undefined {
    const type = this.variables.get(name)
    if (type === undefined) {
      if (this.parent) {
        return this.parent.getVariable(name, markAsUsed)
      } else {
        return undefined
      }
    } else {
      this.unusedVariables.delete(name)
      return type
    }
  }

  /**
   * null is the error type spec while undefined means it's not in scope
   */
  getType (name: string, markAsUsed: boolean): TypeSpec | null | undefined {
    const type = this.types.get(name)
    if (type === undefined) {
      if (this.parent) {
        return this.parent.getType(name, markAsUsed)
      } else {
        return undefined
      }
    } else {
      this.unusedTypes.delete(name)
      return type
    }
  }

  getTypeFrom (base: Type): GetTypeResult {
    try {
      return base.getType(new GetTypeContext(this, base))
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return {
        type: unknown,
      }
    }
  }

  checkPattern (
    base: Pattern,
    idealType: NType,
    definite: boolean,
  ): CheckPatternResult {
    try {
      return base.checkPattern(
        new CheckPatternContext(this, base, idealType, definite),
      )
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return {}
    }
  }

  checkStatement (base: Statement): CheckStatementResult {
    try {
      return base.checkStatement(new CheckStatementContext(this, base))
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return {}
    }
  }

  checkDeclaration (
    base: Declaration,
    valueType?: NType,
    certain = true,
  ): NType {
    try {
      return base.checkDeclaration(
        new ScopeBaseContext(this, base),
        valueType,
        certain,
      )
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return unknown
    }
  }

  typeCheck (base: Expression): TypeCheckResult {
    try {
      const result = base.typeCheck(new TypeCheckContext(this, base))
      if (result.type) {
        this.checker.types.set(base, result.type)
      }
      return result
    } catch (err) {
      this.checker.errors.push({
        message: {
          type: ErrorType.INTERNAL_ERROR,
          error:
            err instanceof Error
              ? err
              : new TypeError(
                  `A non-Error of type ${displayType(err)} was thrown.`,
                ),
        },
        base,
      })
      return {
        type: unknown,
      }
    }
  }

  end () {
    // TODO: unused variables, types
  }
}
