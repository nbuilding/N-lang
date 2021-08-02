import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { bool } from '../../type-checker/types/builtins'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Expression, isExpression } from '../expressions/Expression'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from './Statement'

export class AssertValue extends Base implements Statement {
  expression: Expression
  private _id: number = -1

  constructor (
    pos: BasePosition,
    [, expression]: schem.infer<typeof AssertValue.schema>,
  ) {
    super(pos, [expression])
    this.expression = expression
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    this._id = context.scope.results.addValueAssertion(this)

    const { type, exitPoint } = context.scope.typeCheck(this.expression)
    context.isTypeError(ErrorType.VALUE_ASSERTION_NOT_BOOL, bool, type)
    return { exitPoint }
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    const { statements, expression } = this.expression.compile(scope)
    return {
      statements: [
        ...statements,
        // TODO: Maybe there should be an option to remove this altogether
        `${scope.context.require('assertValue')}(${this._id}, ${expression});`,
      ],
    }
  }

  toString (): string {
    return `assert value ${this.expression}`
  }

  static schema = schema.tuple([schema.any, schema.guard(isExpression)])
}
