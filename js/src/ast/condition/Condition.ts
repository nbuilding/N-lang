import { Expression, isExpression } from '../expressions/Expression'
import { IfLet } from './IfLet'

export type Condition = Expression | IfLet
export function isCondition (value: any): value is Condition {
  return value instanceof IfLet || isExpression(value)
}
