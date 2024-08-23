import { CompilationScope } from '../../compiler/CompilationScope';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
  PatternCompilationResult,
} from './Pattern';

export class DiscardPattern extends Base implements Pattern {
  constructor(pos: BasePosition, _: schem.infer<typeof DiscardPattern.schema>) {
    super(pos);
  }

  checkPattern(_context: CheckPatternContext): CheckPatternResult {
    return {};
  }

  compilePattern(
    _scope: CompilationScope,
    _valueName: string,
  ): PatternCompilationResult {
    return {
      statements: [],
      varNames: [],
    };
  }

  toString(): string {
    return '_';
  }

  static schema = schema.tuple([schema.any]);
}
