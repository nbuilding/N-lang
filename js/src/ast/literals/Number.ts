import { Number as NumberType } from '../../type-checker/types/types'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import { Literal } from './Literal'

// A number can represent either an int or a float
export class Number extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    throw new Error('Not implemented')
    // return { type: new NumberType() }
  }
}
