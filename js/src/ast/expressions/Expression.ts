import { Base } from '../base'

export interface Expression extends Base {}

export function isExpression (value: unknown): value is Expression {
  return false
}
