import { ErrorType } from '../../type-checker/errors/Error'
import { Scope, ScopeBaseContext } from '../../type-checker/Scope'
import { bool } from '../../type-checker/types/builtins'
import { Expression, isExpression } from '../expressions/Expression'
import { Return } from '../expressions/Return'
import { IfLet } from './IfLet'

export type Condition = Expression | IfLet

export function isCondition (value: unknown): value is Condition {
  return value instanceof IfLet || isExpression(value)
}

export interface ConditionResult {
  scope: Scope
  exitPoint?: Return
}

export function checkCondition (
  context: ScopeBaseContext,
  condition: Condition,
): ConditionResult {
  if (condition instanceof IfLet) {
    return condition.checkIfLet(context)
  } else {
    const { type, exitPoint } = context.scope.typeCheck(condition)
    context.isTypeError(ErrorType.CONDITION_NOT_BOOL, bool, type)
    return { scope: context.scope.inner(), exitPoint }
  }
}
