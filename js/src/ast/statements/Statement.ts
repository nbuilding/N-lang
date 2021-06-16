import { ErrorType } from '../../type-checker/errors/Error'
import { Scope, ScopeNames } from '../../type-checker/Scope'
import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext'
import { Base } from '../base'
import { Return } from '../expressions/Return'

export class CheckStatementContext extends ScopeBaseContext {
  constructor (scope: Scope, base: Statement) {
    super(scope, base)
  }

  /** Checks whether exports are allowed in the scope and warns if not. */
  ensureExportsAllowed (addExport?: (names: ScopeNames<Set<string>>) => void) {
    if (this.scope.exports) {
      if (addExport) addExport(this.scope.exports)
    } else {
      this.err({ type: ErrorType.CANNOT_EXPORT })
    }
  }
}

export interface CheckStatementResult {
  exitPoint?: Return
  exitPointWarned?: boolean
}

export interface Statement extends Base {
  checkStatement(context: CheckStatementContext): CheckStatementResult
}

export function isStatement (value: unknown): value is Statement {
  return (
    value instanceof Base &&
    'checkStatement' in value &&
    typeof value['checkStatement'] === 'function'
  )
}
