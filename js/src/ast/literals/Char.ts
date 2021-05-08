import { char } from '../../type-checker/types/builtins'
import { TypeCheckContext, TypeCheckResult } from '../expressions/Expression'
import { Literal } from './Literal'

export class Char extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: char.instance() }
  }

  toString (): string {
    return `\\{${this.value}}`
  }
}
