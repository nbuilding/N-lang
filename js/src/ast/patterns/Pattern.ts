import { Base } from '../base'

export interface Pattern extends Base {}

export function isPattern (value: unknown): value is Pattern {
  return false
}
