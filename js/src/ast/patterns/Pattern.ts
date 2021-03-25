import { ScopeBaseContext } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'

export interface CheckPatternContext extends ScopeBaseContext {
  type: NType
}

export interface CheckPatternResult {
  compatible: boolean
}

export interface Pattern extends Base {
  checkPattern(context: CheckPatternContext): CheckPatternResult
}

export function isPattern (value: unknown): value is Pattern {
  return (
    value instanceof Base &&
    'checkPattern' in value &&
    typeof value['checkPattern'] === 'function'
  )
}
