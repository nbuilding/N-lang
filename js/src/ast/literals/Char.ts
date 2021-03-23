import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import { Literal } from './Literal'

export class Char extends Literal {
  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }
  
  toString () {
    return `\\{${this.value}}`
  }
}
