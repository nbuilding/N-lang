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

export function compileCondition (
  scope: CompilationScope,
  condition: Condition,
): CompilationResult & { scope: CompilationScope } {
  if (condition instanceof IfLet) {
    const { statements: exprS, expression } = condition.expression.compile(
      scope,
    )
    const expressionName = scope.context.genVarName('ifLetValue')
    const innerScope = scope.inner()
    const {
      statements: pattS,
      varNames,
    } = condition.declaration.pattern.compilePattern(innerScope, expressionName)
    const resultName = scope.context.genVarName('ifLetResult')
    return {
      statements: [
        ...exprS,
        `var ${expressionName} = ${expression}${varNames
          .map(name => `  , ${name}`)
          .join('')};`,
        `var ${resultName} = (function () {`,
        ...scope.context.indent([...pattS, 'return true;']),
        `})();`,
      ],
      expression: resultName,
      scope: innerScope,
    }
  } else {
    return {
      ...condition.compile(scope),
      scope: scope.inner(),
    }
  }
}
