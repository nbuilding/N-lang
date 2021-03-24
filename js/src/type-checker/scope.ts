import { Expression, TypeCheckResult } from '../ast/expressions/Expression'
import { CheckStatementResult, Statement } from '../ast/statements/Statement'
import { TypeCheckerResult } from './TypeChecker'
import { TypeSpec } from './types/type-specs'
import { NType } from './types/types'

export class Scope {
  checker: TypeCheckerResult
  parent?: Scope
  variables: Map<string, NType | null> = new Map()
  types: Map<string, TypeSpec> = new Map()
  unusedVariables: Set<string> = new Set()

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

  checkStatement (base: Statement): CheckStatementResult {
    return base.checkStatement({
      scope: this,
      err: error => {
        this.checker.errors.push({ ...error, base })
      },
      warn: warning => {
        this.checker.warnings.push({ ...warning, base })
      },
    })
  }

  typeCheck (base: Expression): TypeCheckResult {
    return base.typeCheck({
      scope: this,
      err: error => {
        this.checker.errors.push({ ...error, base })
      },
      warn: warning => {
        this.checker.warnings.push({ ...warning, base })
      },
    })
  }
}
