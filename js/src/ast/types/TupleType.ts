import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { isType, Type } from './Type'

export class TupleType extends Base implements Type {
  types: Type[]

  constructor (pos: BasePosition, [types, type]: schem.infer<typeof TupleType.schema>) {
    super(pos)
    this.types = [
      ...types.map(([type]) => type),
      type,
    ]
  }

  toString () {
    return `(${this.types.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isType),
      schema.any,
    ])),
    schema.guard(isType),
    schema.any,
  ])
}
