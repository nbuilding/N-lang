import { Scope, ScopeBaseContext } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'

export class CheckPatternContext extends ScopeBaseContext {
  type: NType
  definite: boolean

  constructor (
    scope: Scope,
    base: Pattern,
    idealType: NType,
    definite: boolean,
  ) {
    super(scope, base)
    this.type = idealType
    this.definite = definite
  }
}

export interface CheckPatternResult {}

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
