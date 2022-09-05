import { CompilationScope } from '../../compiler/CompilationScope';
import { float } from '../../type-checker/types/builtins';
import {
  CompilationResult,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression';
import { Literal } from './Literal';

export class Float extends Literal {
  typeCheck(_context: TypeCheckContext): TypeCheckResult {
    return { type: float };
  }

  compile(_scope: CompilationScope): CompilationResult {
    return {
      statements: [],
      expression: this.value,
    };
  }
}
