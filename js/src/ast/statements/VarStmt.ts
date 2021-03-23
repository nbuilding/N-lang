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
    throw new Error('Method not implemented.')
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
