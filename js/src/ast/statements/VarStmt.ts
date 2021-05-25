import { ErrorType } from '../../type-checker/errors/Error'
import { WarningType } from '../../type-checker/errors/Warning'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Expression, isExpression } from '../expressions/Expression'
import { Identifier } from '../literals/Identifier'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class VarStmt extends Base implements Statement {
  var: Identifier
  value: Expression

  constructor (
    pos: BasePosition,
    [, name, , expr]: schem.infer<typeof VarStmt.schema>,
  ) {
    super(pos, [name, expr])
    this.var = name
    this.value = expr
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const type = context.scope.getVariable(this.var.value, true)
    if (this.var.value.startsWith('_')) {
      context.warn({ type: WarningType.USED_UNDERSCORE_IDENTIFIER }, this.var)
    }
    const { type: valueType, exitPoint } = context.scope.typeCheck(this.value)
    if (type) {
      context.isTypeError(ErrorType.VAR_MISMATCH, type, valueType)
    } else {
      context.err(
        { type: ErrorType.UNDEFINED_VARIABLE, name: this.var.value },
        this.var,
      )
    }
    return { exitPoint }
  }

  toString (): string {
    return `var ${this.var} = ${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Identifier),
    schema.any,
    schema.guard(isExpression),
  ])
}
