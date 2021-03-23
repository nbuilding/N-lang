import schema, * as schem from '../../utils/schema'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'

export class RecordAccess extends Base {
  value: Expression
  field: string

  constructor (
    pos: BasePosition,
    [value, , field]: schem.infer<typeof RecordAccess.schema>,
  ) {
    super(pos, [value])
    this.value = value
    this.field = field.value
  }

  toString () {
    return `${this.value}.${this.field}`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
    schema.any,
    schema.instance(Identifier),
  ])
}
