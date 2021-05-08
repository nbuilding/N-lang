import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { TypeVars } from './TypeVars'

export class TypeSpec extends Base {
  name: Identifier
  typeVars: TypeVars | null

  constructor (
    pos: BasePosition,
    [name, maybeTypeVars]: schem.infer<typeof TypeSpec.schema>,
  ) {
    super(pos, [name, maybeTypeVars])
    this.name = name
    this.typeVars = maybeTypeVars
  }

  toString (): string {
    return `${this.name}${this.typeVars || ''}`
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.instance(TypeVars)),
  ])
}
