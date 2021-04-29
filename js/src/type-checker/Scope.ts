import { Base, Declaration } from '../ast/index'
import { Expression, TypeCheckResult } from '../ast/expressions/Expression'
import { CheckStatementResult, Statement } from '../ast/statements/Statement'
import { ErrorMessage, ErrorType } from './errors/Error'
import { WarningMessage } from './errors/Warning'
import { TypeCheckerResult } from './TypeChecker'
import { TypeSpec } from './types/type-specs'
import { NType, resolve } from './types/types'
import { CheckPatternResult, Pattern } from '../ast/patterns/Pattern'
import { GetTypeResult, Type } from '../ast/types/Type'
import { displayType } from '../utils/display-type'

export interface ScopeBaseContext {
  scope: Scope
  err: (error: ErrorMessage, base?: Base) => void
  warn: (warning: WarningMessage, base?: Base) => void
}

export class Scope {
  checker: TypeCheckerResult
  parent?: Scope
  variables: Map<string, NType | null> = new Map()
  types: Map<string, TypeSpec> = new Map()
  unusedVariables: Set<string> = new Set()
  unusedTypes: Set<string> = new Set()

  constructor (checker: TypeCheckerResult, parent?: Scope) {
    this.checker = checker
    this.parent = parent
  }

  inner () {
    return new Scope(this.checker, this)
  }

  getVariable (name: string, markAsUsed: boolean): NType | null | undefined {
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

  getType (name: string, markAsUsed: boolean): TypeSpec | undefined {
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

  private _contextFor (defaultBase: Base): ScopeBaseContext {
    return {
      scope: this,
      err: (error, base = defaultBase) => {
        this.checker.errors.push({ message: error, base })
      },
      warn: (warning, base = defaultBase) => {
        this.checker.warnings.push({ message: warning, base })
      },
    }
  }

  getTypeFrom (base: Type): GetTypeResult {
    try {
      return base.getType({
        ...this._contextFor(base),
      })
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
        type: null,
      }
    }
  }

  checkPattern (
    base: Pattern,
    idealType: NType | null,
    definite: boolean,
  ): CheckPatternResult {
    try {
      return base.checkPattern({
        ...this._contextFor(base),
        type: idealType && resolve(idealType),
        definite,
      })
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
      return base.checkStatement({
        ...this._contextFor(base),
      })
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
    valueType?: NType | null,
    certain = true,
  ): void {
    try {
      base.checkDeclaration(this._contextFor(base), valueType, certain)
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
    }
  }

  typeCheck (base: Expression): TypeCheckResult {
    try {
      const result = base.typeCheck({
        ...this._contextFor(base),
      })
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
        type: null,
      }
    }
  }

  end () {
    // TODO: unused variables, types
  }
}
