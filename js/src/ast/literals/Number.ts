import { CompilationScope } from '../../compiler/CompilationScope'
import { number } from '../../type-checker/types/builtins'
import {
  CompilationResult,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression'
import { Literal } from './Literal'

// A number can represent either an int or a float
export class Number extends Literal {
  typeCheck (_context: TypeCheckContext): TypeCheckResult {
    return { type: number }
  }

  compile (_scope: CompilationScope): CompilationResult {
    // TODO: Might want to use BigInts for ints, but that can't be known here
    return {
      statements: [],
      expression: this.value,
    }
  }
}
