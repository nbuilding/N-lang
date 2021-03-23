import { Base } from '../base'

export interface CheckStatementContext {}

export interface CheckStatementResult {}

export interface Statement extends Base {
  checkStatement (context: CheckStatementContext): CheckStatementResult
}

export function isStatement (value: unknown): value is Statement {
  return value instanceof Base && 'checkStatement' in value
    && typeof value['checkStatement'] === 'function'
}
