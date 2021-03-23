import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression';
import { Literal } from './Literal'

export class Float extends Literal {
  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }
}
