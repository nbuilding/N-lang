import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression';
import { CheckPatternContext, CheckPatternResult, Pattern } from '../patterns/Pattern';
import { Literal } from './Literal'

export class Identifier extends Literal implements Pattern {
  checkPattern (context: CheckPatternContext): CheckPatternResult {
    throw new Error('Method not implemented.')
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }
}
