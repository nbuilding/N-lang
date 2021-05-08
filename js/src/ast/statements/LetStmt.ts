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
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    context.scope.checkDeclaration(this.declaration, type)
    return { exitPoint }
  }

  toString (): string {
    return `let${this.public ? ' pub' : ''} ${this.declaration} = ${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
  ])
}
