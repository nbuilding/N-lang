import { CompilationScope } from '../../compiler/CompilationScope';
import { str } from '../../type-checker/types/builtins';
import {
  CompilationResult,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression';
import { Literal } from './Literal';

export class String extends Literal {
  typeCheck(_context: TypeCheckContext): TypeCheckResult {
    return { type: str };
  }

  compile(_scope: CompilationScope): CompilationResult {
    return {
      statements: [],
      expression: JSON.stringify(this.value),
    };
  }

  toString(): string {
    return JSON.stringify(this.value);
  }
}
