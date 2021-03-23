import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class ImportStmt extends Base implements Statement {
  name: Identifier

  constructor (
    pos: BasePosition,
    [, , id]: schem.infer<typeof ImportStmt.schema>,
  ) {
    super(pos, [id])
    this.name = id
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    throw new Error('Method not implemented.')
  }

  toString (): string {
    return `import ${this.name}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.instance(Identifier),
  ])
}
