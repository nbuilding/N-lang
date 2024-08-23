import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import { bool } from '../../type-checker/types/builtins';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { Expression, isExpression } from '../expressions/Expression';
import { Block } from './Block';
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from './Statement';

export class While extends Base implements Statement {
  value: Expression;
  body: Block;

  constructor(
    pos: BasePosition,
    [, value, , block]: [unknown, Expression, unknown, Block, unknown],
  ) {
    super(pos, [value, block]);
    this.value = value;
    this.body = block;
  }

  checkStatement(context: CheckStatementContext): CheckStatementResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value);
    const scope = context.scope.inner();
    if (type.type === 'named' && type.typeSpec === bool.typeSpec) {
      context.err({
        type: ErrorType.WHILE_NOT_BOOL,
      });
    }
    scope.checkStatement(this.body);
    scope.end();
    return { exitPoint };
  }
  loop(
    scope: CompilationScope,
    expression: string,
    loopBody: string[],
  ): string[] {
    return [
      `while (${expression}) {`,
      ...scope.context.indent([...loopBody]),
      '}',
    ];
  }

  asyncLoop(
    scope: CompilationScope,
    expression: string,
    loopDone: string,
    step: string,
    then: string,
  ): string[] {
    const index = scope.context.genVarName('index');
    return [
      `var ${index} = ${expression};`,
      `function ${loopDone}() {`,
      `  if (${index}) {`,
      `    ${index} = ${expression};`,
      `    ${step}();`,
      '  } else {',
      `    ${then}();`,
      '  }',
      '}',
    ];
  }

  compileStatement(scope: CompilationScope): StatementCompilationResult {
    const loopDone = scope.context.genVarName('done');

    const { statements: valueS, expression } = this.value.compile(scope);
    const loopScope = scope.inner();
    const loopBody = [
      ...this.body.compileStatement(loopScope, loopDone).statements,
    ];
    if (scope.procedure && scope.procedure.didChildScopeUseAwait()) {
      const thenName = scope.context.genVarName('then');
      const step = scope.context.genVarName('oldForStep');
      scope.procedure.addToChain({
        statements: [
          ...valueS,
          ...this.asyncLoop(scope, expression, loopDone, step, thenName),
          `function ${step}() {`,
          ...scope.context.indent(loopBody),
          '}',
          `${step}();`,
        ],
        thenName,
      });
      return {
        statements: [],
      };
    } else {
      return {
        statements: [...valueS, ...this.loop(scope, expression, loopBody)],
      };
    }
  }

  toString(): string {
    return `while (${this.value}) ${this.body}`;
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.instance(Block),
    schema.any,
  ]);
}
