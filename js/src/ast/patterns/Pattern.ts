import { Base } from '../base'

export interface CheckPatternContext {}

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
