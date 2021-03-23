import { CheckStatementResult, Statement } from '../ast/statements/Statement'
import { TypeCheckerResult } from './checker'
import { TypeSpec } from './types/type-specs'
import { NType } from './types/types'

export class Scope {
  checker: TypeCheckerResult
  parent?: Scope
  variables: Map<string, NType> = new Map()
  types: Map<string, TypeSpec> = new Map()

  constructor (checker: TypeCheckerResult, parent?: Scope) {
    this.checker = checker
    this.parent = parent
  }

  inner () {
    return new Scope(this.checker, this)
  }

  checkStatement (base: Statement): CheckStatementResult {
    return base.checkStatement({
      checker: this.checker,
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
