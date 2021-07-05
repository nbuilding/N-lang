import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { Scope } from '../../type-checker/Scope'
import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext'
import { bool } from '../../type-checker/types/builtins'
import {
  CompilationResult,
  Expression,
  isExpression,
} from '../expressions/Expression'
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

export type ConditionCompilationResult = {
  statements: string[]
  result: string
  scope: CompilationScope
}

export function compileCondition (
  scope: CompilationScope,
  condition: Condition,
): ConditionCompilationResult {
  if (condition instanceof IfLet) {
    const { statements: exprS, expression } = condition.expression.compile(
      scope,
    )
    const expressionName = scope.context.genVarName('ifLetValue')
    const innerScope = scope.inner()
    const resultName = scope.context.genVarName('ifLetResult')
    return {
      statements: [
        ...exprS,
        `var ${expressionName} = ${expression};`,
        ...condition.declaration.compileDeclaration(
          innerScope,
          expressionName,
          resultName,
        ),
      ],
      result: resultName,
      scope: innerScope,
    }
  } else {
    const { statements, expression } = condition.compile(scope)
    return {
      statements,
      result: expression,
      scope: scope.inner(),
    }
  }
}
