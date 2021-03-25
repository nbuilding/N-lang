import { Base } from '../ast/index'
import { Expression, TypeCheckResult } from '../ast/expressions/Expression'
import { CheckStatementResult, Statement } from '../ast/statements/Statement'
import { ErrorMessage } from './errors/Error'
import { WarningMessage } from './errors/Warning'
import { TypeCheckerResult } from './TypeChecker'
import { TypeSpec } from './types/type-specs'
import { NType, resolve } from './types/types'
import { CheckPatternResult, Pattern } from '../ast/patterns/Pattern'
import { GetTypeResult, Type } from '../ast/types/Type'

export interface ScopeBaseContext {
  scope: Scope
  err: (error: ErrorMessage) => void
  warn: (warning: WarningMessage) => void
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

  private _contextFor (base: Base): ScopeBaseContext {
    return {
      scope: this,
      err: error => {
        this.checker.errors.push({ message: error, base })
      },
      warn: warning => {
        this.checker.warnings.push({ message: warning, base })
      },
    }
  }

  getTypeFrom (base: Type): GetTypeResult {
    return base.getType({
      ...this._contextFor(base),
    })
  }

  checkPattern (base: Pattern, idealType: NType): CheckPatternResult {
    return base.checkPattern({
      ...this._contextFor(base),
      type: resolve(idealType),
    })
  }

  checkStatement (base: Statement): CheckStatementResult {
    return base.checkStatement({
      ...this._contextFor(base),
    })
  }

  typeCheck (base: Expression): TypeCheckResult {
    const result = base.typeCheck({
      ...this._contextFor(base),
    })
    if (result.type) {
      this.checker.types.set(base, result.type)
    }
    return result
  }
}
