import { float } from '../../type-checker/types/builtins'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import { Literal } from './Literal'

export class Float extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: float }
  }
}
