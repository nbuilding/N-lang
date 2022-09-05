import { CompilationScope } from '../../compiler/CompilationScope';
import { WarningType } from '../../type-checker/errors/Warning';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { Return } from '../expressions/Return';
import {
  CheckStatementContext,
  CheckStatementResult,
  isStatement,
  Statement,
  StatementCompilationResult,
} from './Statement';

export class Block extends Base implements Statement {
  statements: Statement[];

  constructor(
    pos: BasePosition,
    rawStatements?: schem.infer<typeof Block.schema>,
  ) {
    const statements = rawStatements
      ? [...rawStatements[0].map(([statement]) => statement), rawStatements[1]]
      : [];
    super(pos, statements);
    this.statements = statements;
  }

  checkStatement(context: CheckStatementContext): CheckStatementResult {
    // NOTE: Blocks do not create their own scope
    let blockExitPoint: Return | undefined;
    let warned = false;
    for (const statement of this.statements) {
      const { exitPoint, exitPointWarned } =
        context.scope.checkStatement(statement);
      if (blockExitPoint) {
        if (!warned) {
          context.warn({
            type: WarningType.STATEMENT_NEVER,
            exitPoint: blockExitPoint,
          });
          warned = true;
        }
      } else if (exitPoint) {
        blockExitPoint = exitPoint;
        if (exitPointWarned) {
          warned = true;
        }
      }
    }
    return {
      exitPoint: blockExitPoint,
      exitPointWarned: warned,
    };
  }

  compileStatement(
    scope: CompilationScope,
    thenName?: string,
  ): StatementCompilationResult {
    if (scope.procedure) {
      // Keep track of awaits used in the block
      scope.procedure.newChain();
    }
    let statements: string[] = [];
    for (const statement of this.statements) {
      const { statements: s } = statement.compileStatement(scope);
      if (scope.procedure && scope.procedure.wasModified()) {
        scope.procedure.prependStatements(statements);
        statements = [];
      }
      statements.push(...s);
    }
    if (scope.procedure) {
      if (thenName && scope.procedure.everModified()) {
        statements.push(`${thenName}();`);
      }
      statements = scope.procedure.toStatements(statements);
      scope.procedure.endChain();
    }
    return {
      statements,
    };
  }

  toString(): string {
    return this.statements.join('\n');
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([schema.guard(isStatement), schema.any])),
    schema.guard(isStatement),
  ]);

  static empty(): Block {
    return new Block({
      // Dummy values
      line: 0,
      col: 0,
      endLine: 0,
      endCol: 0,
    });
  }
}
