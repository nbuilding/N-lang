import { ErrorType } from '../../type-checker/errors/Error'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
} from '../patterns/Pattern'
import { Literal } from './Literal'

export class Identifier extends Literal implements Pattern {
  checkPattern (context: CheckPatternContext): CheckPatternResult {
    throw new Error('Method not implemented.')
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const type = context.scope.getVariable(this.value, true)
    if (type !== undefined) {
      return { type }
    } else {
      context.err({ type: ErrorType.UNDEFINED_VARIABLE, name: this.value })
      return { type: null }
    }
  }
}
