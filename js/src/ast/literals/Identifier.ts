import { ErrorType } from '../../type-checker/errors/Error'
import { WarningType } from '../../type-checker/errors/Warning'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
} from '../patterns/Pattern'
import { Literal } from './Literal'

export class Identifier extends Literal implements Pattern {
  checkPattern (context: CheckPatternContext): CheckPatternResult {
    if (context.scope.variables.has(this.value)) {
      // TODO: error about duplicate variable
      // null type because can't be sure which type it's referring to
      context.scope.variables.set(this.value, null)
    } else {
      context.scope.variables.set(this.value, context.type)
      context.scope.unusedVariables.add(this.value)
    }
    return {}
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const type = context.scope.getVariable(this.value, true)
    if (this.value.startsWith('_')) {
      context.warn({ type: WarningType.USED_UNDERSCORE_IDENTIFIER })
    }
    if (type !== undefined) {
      return { type }
    } else {
      context.err({ type: ErrorType.UNDEFINED_VARIABLE, name: this.value })
      return { type: null }
    }
  }
}
