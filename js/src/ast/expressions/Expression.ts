import { ErrorNoBase } from '../../type-checker/errors/Error'
import { WarningNoBase } from '../../type-checker/errors/Warning'
import { Scope } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'

export interface TypeCheckContext {
  scope: Scope
  err: (error: ErrorNoBase) => void
  warn: (warning: WarningNoBase) => void
}

export interface TypeCheckResult {
  type: NType | null
}

export interface Expression extends Base {
  typeCheck(context: TypeCheckContext): TypeCheckResult
}

export function isExpression (value: unknown): value is Expression {
  return (
    value instanceof Base &&
    'typeCheck' in value &&
    typeof value['typeCheck'] === 'function'
  )
}
