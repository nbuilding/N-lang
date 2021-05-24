import { str } from '../../type-checker/types/builtins'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import { Literal } from './Literal'

export class String extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: str }
  }

  toString (): string {
    return JSON.stringify(this.value)
  }
}
