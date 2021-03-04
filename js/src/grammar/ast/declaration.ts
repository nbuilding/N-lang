import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Identifier } from './literals'
import { isType, Type } from './types'

export class Declaration extends Base {
  name: Identifier | null
  type: Type | null

  constructor (pos: BasePosition, [id, maybeType]: schem.infer<typeof Declaration.schema>) {
    super(pos, maybeType && maybeType[1] ? [maybeType[1]] : [])
    this.name = id
    this.type = maybeType && maybeType[1]
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
}
