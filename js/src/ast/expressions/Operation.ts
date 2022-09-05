import schema, * as schem from '../../utils/schema';
import { from, Preprocessor } from '../../grammar/from-nearley';
import {
  CompilationResult,
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression';
import { Base, BasePosition } from '../base';
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from '../statements/Statement';
import { tryFunctions } from '../../type-checker/types/comparisons/compare-assignable';
import { operations } from '../../type-checker/types/operations';
import { NType, unknown } from '../../type-checker/types/types';
import {
  Operator,
  operatorToString,
} from '../../type-checker/types/operations/Operator';
import { ErrorType } from '../../type-checker/errors/Error';
import { CompilationScope } from '../../compiler/CompilationScope';
import { isInt, isMap, isMaybe } from '../../type-checker/types/builtins';

export class Operation<O extends Operator>
  extends Base
  implements Expression, Statement
{
  type: O;
  a: Expression;
  b: Expression;
  private _operandType?: NType;

  constructor(
    pos: BasePosition,
    operator: O,
    expr: Expression,
    val: Expression,
  ) {
    super(pos, [expr, val]);
    this.type = operator;
    this.a = expr;
    this.b = val;
  }

  checkStatement(context: CheckStatementContext): CheckStatementResult {
    const { exitPoint } = context.scope.typeCheck(this);
    if (this.type !== Operator.PIPE) {
      throw new Error('Non-pipe operator should not be a statement');
    }
    return { exitPoint };
  }

  typeCheck(context: TypeCheckContext): TypeCheckResult {
    const { type: typeA, exitPoint: exitA } = context.scope.typeCheck(this.a);
    const { type: typeB, exitPoint: exitB } = context.scope.typeCheck(this.b);
    this._operandType = typeA;
    const operationType = tryFunctions(operations[this.type], [typeA, typeB]);
    if (!operationType) {
      context.err({
        type: ErrorType.OPERATION_UNPERFORMABLE,
        a: typeA,
        b: typeB,
        operation: this.type,
      });
    }
    return { type: operationType || unknown, exitPoint: exitA || exitB };
  }

  compile(scope: CompilationScope): CompilationResult {
    const { statements: sA, expression: a } = this.a.compile(scope);
    const { statements: sB, expression: b } = this.b.compile(scope);
    const statements = [...sA, ...sB];
    switch (this.type) {
      case Operator.ADD: {
        return {
          statements,
          expression: `(${a}) + (${b})`,
        };
      }
      case Operator.MINUS: {
        return {
          statements,
          expression: `(${a}) - (${b})`,
        };
      }
      case Operator.MULTIPLY: {
        return {
          statements,
          expression: `(${a}) * (${b})`,
        };
      }
      case Operator.XOR: {
        return {
          statements,
          expression: `(${a}) ^ (${b})`,
        };
      }
      case Operator.SHIFTL: {
        return {
          statements,
          expression: `(${a}) << (${b})`,
        };
      }
      case Operator.SHIFTR: {
        return {
          statements,
          expression: `(${a}) >> (${b})`,
        };
      }
      case Operator.DIVIDE: {
        if (isInt(this._operandType!)) {
          // Integer division with floats
          const quotient = scope.context.genVarName('quotient');
          return {
            statements: [
              ...statements,
              // Currently ints are represented as floats
              `var ${quotient} = (${a}) / (${b});`,
            ],
            // If the quotient is NaN or an Infinity, cast it to 0.
            // Else, truncate it. (Math.trunc is not supported in IE.)
            expression: `isFinite(${quotient}) ? (${quotient} < 0 ? Math.ceil(${quotient}) : Math.floor(${quotient})) : 0`,
          };
        } else {
          return {
            statements,
            expression: `(${a}) / (${b})`,
          };
        }
      }
      case Operator.MODULO: {
        return {
          statements,
          expression: `${scope.context.require('modulo')}(${a}, ${b})`,
        };
      }
      case Operator.EXPONENT: {
        return {
          statements,
          expression: `Math.pow(${a}, ${b})`,
        };
      }
      case Operator.AND: {
        if (isInt(this._operandType!)) {
          return {
            statements,
            expression: `(${a}) & (${b})`,
          };
        } else {
          if (sB.length === 0) {
            return {
              statements: sA,
              expression: `(${a}) && (${b})`,
            };
          } else {
            // Short circuit if `a` evaluates to false
            const result = scope.context.genVarName('andResult');
            return {
              statements: [
                ...sA,
                `var ${result} = false;`,
                `if (${a}) {`,
                ...scope.context.indent([...sB, `${result} = ${b};`]),
                '}',
              ],
              expression: result,
            };
          }
        }
      }
      case Operator.OR: {
        if (isInt(this._operandType!)) {
          return {
            statements,
            expression: `(${a}) | (${b})`,
          };
        } else if (isMaybe(this._operandType!)) {
          return {
            statements,
            expression: `(${a}) ?? (${b})`,
          };
        } else {
          if (sB.length === 0) {
            return {
              statements: sA,
              expression: `(${a}) || (${b})`,
            };
          } else {
            // Short circuit if `a` evaluates to true
            const result = scope.context.genVarName('orResult');
            return {
              statements: [
                ...sA,
                `var ${result} = true;`,
                `if (!${a}) {`,
                ...scope.context.indent([...sB, `${result} = ${b};`]),
                '}',
              ],
              expression: result,
            };
          }
        }
      }
      case Operator.PIPE: {
        return {
          statements,
          expression: `(${b})(${a})`,
        };
      }
      case Operator.INDEX: {
        if (isMap(this._operandType!)) {
          return {
            statements,
            expression: `(${a}).get((${b}))`,
          };
        }
        return {
          statements,
          expression: `(${a})[(${b})]`,
        };
      }
      default: {
        throw new Error('What operator could this be? ' + this.type);
      }
    }
  }

  compileStatement(scope: CompilationScope): StatementCompilationResult {
    // TODO: An option to optimise these away
    const { statements, expression } = this.compile(scope);
    return {
      statements: [...statements, expression + ';'],
    };
  }

  toString(): string {
    return `(${this.a} ${operatorToString(this.type)} ${this.b})`;
  }

  static operation<O extends Operator>(
    operator: O,
  ): Preprocessor<Operation<O>> {
    const opSchema =
      operator !== Operator.INDEX
        ? schema.tuple([
            schema.guard(isExpression),
            schema.any,
            schema.any,
            schema.any,
            schema.guard(isExpression),
          ])
        : schema.tuple([
            schema.guard(isExpression),
            schema.any,
            schema.any,
            schema.any,
            schema.guard(isExpression),
            schema.any,
            schema.any,
          ]);
    function fromSchema(
      pos: BasePosition,
      [expr, , , , val]: schem.infer<typeof opSchema>,
    ): Operation<O> {
      return new Operation(pos, operator, expr, val);
    }
    return from({ schema: opSchema, from: fromSchema });
  }
}
