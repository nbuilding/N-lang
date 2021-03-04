import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Identifier } from './literals'
import { isType, Type } from './types'

export class Declaration extends Base {
  name: Identifier | null
  type: Type | null

  constructor (pos: BasePosition, name: Identifier | null, type: Type | null) {
    super(pos, type ? [type] : [])
    this.name = name
    this.type = type
  }

  toString () {
    return this.type ? `${this.name}: ${this.type}` : this.name
  }

  static schema = schema.tuple([
    schema.instance(Identifier), // TODO: _
    schema.nullable(schema.tuple([
      schema.any,
      schema.guard(isType),
    ])),
  ])

  static fromSchema (pos: BasePosition, [id, maybeType]: schem.infer<typeof Declaration.schema>): Declaration {
    return new Declaration(pos, id, maybeType && maybeType[1])
  }
}
