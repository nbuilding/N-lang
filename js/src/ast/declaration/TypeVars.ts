import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'

export class TypeVars extends Base {
  vars: string[]

  constructor (pos: BasePosition, [, typeVars, typeVar]: schem.infer<typeof TypeVars.schema>) {
    super(pos)
    this.vars = [
      ...typeVars.map(([name]) => name.value),
      typeVar.value,
    ]
  }

  toString () {
    return `[${this.vars.join(', ')}]`
  }

  static schema = schema.tuple([
    schema.any,
    schema.array(schema.tuple([
      schema.instance(Identifier),
      schema.any,
    ])),
    schema.instance(Identifier),
    schema.any,
  ])
}
