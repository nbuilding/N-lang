import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression';
import { Literal } from './Literal'

// A number can represent either an int or a float
export class Number extends Literal {
  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }
}
