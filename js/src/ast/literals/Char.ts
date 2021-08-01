import { CompilationScope } from '../../compiler/CompilationScope'
import { char } from '../../type-checker/types/builtins'
import {
  CompilationResult,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression'
import { Literal } from './Literal'

export class Char extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: char }
  }

  compile (_scope: CompilationScope): CompilationResult {
    return {
      statements: [],
      expression: JSON.stringify(this.value),
    }
  }

  toString (): string {
    return `\\{${this.value}}`
  }
}
