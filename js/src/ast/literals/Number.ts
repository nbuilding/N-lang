import { number } from '../../type-checker/types/builtins'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import { Literal } from './Literal'

// A number can represent either an int or a float
export class Number extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: number }
  }
}
