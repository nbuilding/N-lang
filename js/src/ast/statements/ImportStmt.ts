import { modules } from '../../native-modules'
import { ErrorType } from '../../type-checker/errors/Error'
import { unknown } from '../../type-checker/types/types'
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
    if (modules.hasOwnProperty(this.name.value)) {
      context.defineVariable(this.name, {
        type: 'module',
        path: this.name.value,
        types: new Map(
          Object.entries(modules[this.name.value].variables || {}),
        ),
        exportedTypes: new Map(
          Object.entries(modules[this.name.value].types || {}),
        ),
      })
    } else {
      context.err({ type: ErrorType.NO_NATIVE_MODULE })
      context.defineVariable(this.name, unknown)
    }
    return {}
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
