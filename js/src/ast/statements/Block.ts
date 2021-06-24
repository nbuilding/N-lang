import { WarningType } from '../../type-checker/errors/Warning'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Return } from '../expressions/Return'
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
    // NOTE: Blocks do not create their own scope
    let blockExitPoint: Return | undefined
    let warned = false
    for (const statement of this.statements) {
      const { exitPoint, exitPointWarned } = context.scope.checkStatement(
        statement,
      )
      if (blockExitPoint) {
        if (!warned) {
          context.warn({
            type: WarningType.STATEMENT_NEVER,
            exitPoint: blockExitPoint,
          })
          warned = true
        }
      } else if (exitPoint) {
        blockExitPoint = exitPoint
        if (exitPointWarned) {
          warned = true
        }
      }
    }
    return {
      exitPoint: blockExitPoint,
      exitPointWarned: warned,
    }
  }

  toString (topLevel = false): string {
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
