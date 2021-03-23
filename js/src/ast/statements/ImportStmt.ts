import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { Statement } from './Statement'

export class ImportStmt extends Base implements Statement {
  name: string

  constructor (pos: BasePosition, [, , id]: schem.infer<typeof ImportStmt.schema>) {
    super(pos)
    this.name = id.value
  }

  toString () {
    return `import ${this.name}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.instance(Identifier),
  ])
}
