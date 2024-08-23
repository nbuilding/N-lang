import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import { WarningType } from '../../type-checker/errors/Warning';
import { cmd } from '../../type-checker/types/builtins';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { Expression, isExpression } from '../expressions/Expression';
import { Identifier } from '../literals/Identifier';
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from './Statement';

export class VarStmt extends Base implements Statement {
  var: Identifier;
  value: Expression;

  constructor(
    pos: BasePosition,
    [name, , expr]: schem.infer<typeof VarStmt.schema>,
  ) {
    super(pos, [name, expr]);
    this.var = name;
    this.value = expr;
  }

  checkStatement(context: CheckStatementContext): CheckStatementResult {
    const returnType = context.scope.getReturnType();
    if (
      returnType &&
      returnType.type === 'named' &&
      returnType.typeSpec === cmd
    ) {
      context.warn({
        type: WarningType.VAR_UNSAFE,
      });
    }
    const type = context.scope.getVariable(this.var.value, false);
    if (this.var.value.startsWith('_')) {
      context.warn(
        {
          type: WarningType.USED_UNDERSCORE_IDENTIFIER,
          name: this.var.value,
          value: 'variable',
        },
        this.var,
      );
    }
    const { type: valueType, exitPoint } = context.scope.typeCheck(this.value);
    if (type) {
      if (context.scope.isVariableMutable(this.var.value)) {
        context.isTypeError(ErrorType.VAR_MISMATCH, type, valueType);
      } else {
        context.err(
          { type: ErrorType.NON_MUT_VARIABLE, name: this.var.value },
          this.var,
        );
      }
    } else {
      context.err(
        { type: ErrorType.UNDEFINED_VARIABLE, name: this.var.value },
        this.var,
      );
    }
    return { exitPoint };
  }

  compileStatement(scope: CompilationScope): StatementCompilationResult {
    const { statements, expression } = this.value.compile(scope);
    const name = scope.getName(this.var.value);
    return {
      statements: [...statements, `${name} = ${expression};`],
    };
  }

  toString(): string {
    return `${this.var} = ${this.value}`;
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.any,
    schema.guard(isExpression),
  ]);
}
