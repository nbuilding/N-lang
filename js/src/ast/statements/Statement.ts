import { CompilationScope } from '../../compiler/CompilationScope';
import { Scope } from '../../type-checker/Scope';
import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext';
import { Base } from '../base';
import { Return } from '../expressions/Return';

export class CheckStatementContext extends ScopeBaseContext {
  constructor(scope: Scope, base: Statement) {
    super(scope, base);
  }
}

export interface CheckStatementResult {
  exitPoint?: Return;
  exitPointWarned?: boolean;
}

export type StatementCompilationResult = {
  statements: string[];
};

export interface Statement extends Base {
  checkStatement(context: CheckStatementContext): CheckStatementResult;

  compileStatement(scope: CompilationScope): StatementCompilationResult;
}

export function isStatement(value: unknown): value is Statement {
  return (
    value instanceof Base &&
    'checkStatement' in value &&
    typeof value['checkStatement'] === 'function'
  );
}
