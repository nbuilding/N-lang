import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import { WarningType } from '../../type-checker/errors/Warning';
import { unknown } from '../../type-checker/types/types';
import {
  CompilationResult,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression';
import {
  CheckPatternContext,
  CheckPatternResult,
  Pattern,
  PatternCompilationResult,
} from '../patterns/Pattern';
import { Literal } from './Literal';

export class Identifier extends Literal implements Pattern {
  checkPattern(context: CheckPatternContext): CheckPatternResult {
    // Exportability is warned about in LetStmt, so there's no need to create
    // errors here
    context.defineVariable(
      this,
      context.type,
      context.public && context.scope.exports !== null,
      false,
      context.mutable,
    );
    return {};
  }

  typeCheck(context: TypeCheckContext): TypeCheckResult {
    const type = context.scope.getVariable(this.value, true);
    if (this.value.startsWith('_')) {
      context.warn({
        type: WarningType.USED_UNDERSCORE_IDENTIFIER,
        name: this.value,
        value: 'variable',
      });
    }
    if (type) {
      return { type };
    } else {
      context.err({ type: ErrorType.UNDEFINED_VARIABLE, name: this.value });
      return { type: unknown };
    }
  }

  compile(scope: CompilationScope): CompilationResult {
    return {
      statements: [],
      expression: scope.getName(this.value),
    };
  }

  compilePattern(
    scope: CompilationScope,
    valueName: string,
  ): PatternCompilationResult {
    const varName = scope.context.genVarName(this.value);
    scope.names.set(this.value, varName);
    return {
      statements: [`${varName} = ${valueName};`],
      varNames: [varName],
    };
  }
}
