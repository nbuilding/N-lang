import { Base } from '../ast/base'
import { ErrorMessage, TypeErrorType } from './errors/Error'
import { WarningMessage } from './errors/Warning'
import { Scope } from './Scope'
import { attemptAssign } from './types/comparisons/compare-assignable'
import { NType } from './types/types'

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
