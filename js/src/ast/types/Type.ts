import { Base } from '../base'

export interface Type extends Base {}

export function isType (value: unknown): value is Type {
  return false
}
