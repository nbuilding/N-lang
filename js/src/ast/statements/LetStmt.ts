import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'
import { Expression, isExpression } from '../expressions/Expression'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class LetStmt extends Base implements Statement {
  public: boolean
  declaration: Declaration
  value: Expression

  constructor (
    pos: BasePosition,
    [, pub, decl, , expr]: schem.infer<typeof LetStmt.schema>,
  ) {
    super(pos, [decl, expr])
    this.declaration = decl
    this.public = pub !== null
    this.value = expr
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return `let${this.public ? ' pub' : ''} ${this.declaration} = ${this.value}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.nullable(schema.tuple([schema.any, schema.any])),
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
    ])
  }
}