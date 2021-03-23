import { Base } from '../base'

export interface Statement extends Base {}

export function isStatement (value: unknown): value is Statement {
  return false
}
