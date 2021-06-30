import { Scope } from '../../type-checker/Scope'
import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'
import { Return } from './Return'

export class TypeCheckContext extends ScopeBaseContext {
  constructor (scope: Scope, base: Expression) {
    super(scope, base)
  }
}

export interface TypeCheckResult {
  type: NType
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
