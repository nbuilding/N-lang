import { CompilationScope } from '../../compiler/CompilationScope';
import { unit } from '../../type-checker/types/builtins';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import {
  CompilationResult,
  Expression,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression';

export class Unit extends Base implements Expression {
  constructor(pos: BasePosition, _: schem.infer<typeof Unit.schema>) {
    super(pos);
  }

  typeCheck(_context: TypeCheckContext): TypeCheckResult {
    return { type: unit };
  }

  compile(scope: CompilationScope): CompilationResult {
    return {
      statements: [],
      // () is represented as any value because we already know its value at
      // compile time. Ideally this value should never be read directly.
      expression: 'undefined',
    };
  }

  toString(): string {
    return '()';
  }

  static schema = schema.tuple([schema.any, schema.any, schema.any]);
}
