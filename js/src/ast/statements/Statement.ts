import { ScopeBaseContext } from '../../type-checker/Scope'
import { Base } from '../base'
import { Return } from '../expressions/Return'

export interface CheckStatementContext extends ScopeBaseContext {}

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
