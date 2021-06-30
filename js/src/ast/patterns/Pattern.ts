import { Scope } from '../../type-checker/Scope'
import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext'
import { NType } from '../../type-checker/types/types'
import { Base } from '../base'

export class CheckPatternContext extends ScopeBaseContext {
  type: NType
  definite: boolean
  public: boolean

  constructor (
    scope: Scope,
    base: Pattern,
    idealType: NType,
    definite: boolean,
    isPublic: boolean,
  ) {
    super(scope, base)
    this.type = idealType
    this.definite = definite
    this.public = isPublic
  }

  checkPattern (base: Pattern, idealType: NType): CheckPatternResult {
    return this.scope.checkPattern(base, idealType, this.definite, this.public)
  }
}

export type CheckPatternResult = Record<string, never>

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
