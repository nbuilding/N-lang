import { Identifier } from '../ast'
import { Base } from '../ast/base'
import { ErrorMessage, ErrorType, TypeErrorType } from './errors/Error'
import { WarningMessage, WarningType } from './errors/Warning'
import { Scope } from './Scope'
import { attemptAssign } from './types/comparisons/compare-assignable'
import { NType, unknown } from './types/types'
import { TypeSpec } from './types/TypeSpec'

export class ScopeBaseContext {
  scope: Scope
  private _defaultBase: Base

  constructor (scope: Scope, base: Base) {
    this.scope = scope
    this._defaultBase = base
  }

  err (error: ErrorMessage, base: Base = this._defaultBase): void {
    this.scope.results.errors.push({ message: error, base })
  }

  warn (warning: WarningMessage, base: Base = this._defaultBase): void {
    this.scope.results.warnings.push({ message: warning, base })
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

  defineVariable (
    name: Identifier,
    type: NType,
    isPublic = false,
    warnAboutExportability = true,
  ): void {
    if (this.scope.variables.has(name.value)) {
      this.err({ type: ErrorType.DUPLICATE_VARIABLE }, name)
      this.scope.variables.set(name.value, unknown)
    } else {
      this.scope.variables.set(name.value, type)
      if (!isPublic && !name.value.startsWith('_')) {
        this.scope.unused.variables.set(name.value, name)
      }
    }
    if (isPublic) {
      if (this.scope.exports) {
        this.scope.exports.variables.add(name.value)
        if (name.value.startsWith('_')) {
          this.warn({
            type: WarningType.EXPORT_UNDERSCORE,
            name: name.value,
            value: 'variable',
          })
        }
      } else if (warnAboutExportability) {
        this.err({ type: ErrorType.CANNOT_EXPORT }, name)
      }
    }
  }

  defineType (
    name: Identifier,
    type: TypeSpec | 'error',
    isPublic = false,
  ): void {
    if (this.scope.types.has(name.value)) {
      this.err({ type: ErrorType.DUPLICATE_TYPE }, name)
      this.scope.types.set(name.value, 'error')
    } else {
      this.scope.types.set(name.value, type)
      if (!isPublic && !name.value.startsWith('_')) {
        this.scope.unused.types.set(name.value, name)
      }
    }
    if (isPublic) {
      if (this.scope.exports) {
        this.scope.exports.types.add(name.value)
        if (this.scope.inClass()) {
          this.warn({ type: WarningType.CLASS_EXPORT_TYPE }, name)
        } else if (name.value.startsWith('_')) {
          this.warn({
            type: WarningType.EXPORT_UNDERSCORE,
            name: name.value,
            value: 'type',
          })
        }
      } else {
        this.err({ type: ErrorType.CANNOT_EXPORT }, name)
      }
    }
  }
}
