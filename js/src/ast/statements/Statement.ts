import { TypeCheckerResult } from '../../type-checker/checker'
import { ErrorNoBase } from '../../type-checker/errors/Error'
import { WarningNoBase } from '../../type-checker/errors/Warning'
import { Scope } from '../../type-checker/Scope'
import { Base } from '../base'
import { Return } from '../expressions/Return'

export interface CheckStatementContext {
  checker: TypeCheckerResult
  scope: Scope
  err: (error: ErrorNoBase) => void
  warn: (warning: WarningNoBase) => void
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
