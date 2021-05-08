import { ScopeBaseContext } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'
import { Return } from './Return'

export interface TypeCheckContext extends ScopeBaseContext {}

export interface TypeCheckResult {
  type: NType | null
  exitPoint?: Return
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
