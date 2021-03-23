import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import {
  CheckStatementContext,
  CheckStatementResult,
  isStatement,
  Statement,
} from './Statement'

export class Block extends Base implements Statement {
  statements: Statement[]

  constructor (
    pos: BasePosition,
    rawStatements?: schem.infer<typeof Block.schema>,
  ) {
    const statements = rawStatements
      ? [...rawStatements[0].map(([statement]) => statement), rawStatements[1]]
      : []
    super(pos, statements)
    this.statements = statements
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    throw new Error('Method not implemented.')
  }

  toString (topLevel = false) {
    if (topLevel) {
      return this.statements.join('\n')
    }
    // Add additional indentation after every newline
    return `{\n\t${this.statements.join('\n').replace(/\n/g, '\n\t')}\n}`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([schema.guard(isStatement), schema.any])),
    schema.guard(isStatement),
  ])

  static empty (): Block {
    return new Block({
      // Dummy values
      line: 0,
      col: 0,
      endLine: 0,
      endCol: 0,
    })
  }
}
