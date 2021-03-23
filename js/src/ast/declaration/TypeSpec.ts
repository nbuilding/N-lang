import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { TypeVars } from './TypeVars'

export class TypeSpec extends Base {
  name: string
  typeVars: TypeVars | null

  constructor (
    pos: BasePosition,
    [name, maybeTypeVars]: schem.infer<typeof TypeSpec.schema>,
  ) {
    super(pos)
    this.name = name.value
    this.typeVars = maybeTypeVars
  }

  toString () {
    return `${this.name}${this.typeVars || ''}`
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.instance(TypeVars)),
  ])
}
