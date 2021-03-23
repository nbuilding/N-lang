import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import { from } from '../../grammar/from-nearley'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'

export class RecordEntry extends Base {
  key: string
  value: Expression

  constructor (
    pos: BasePosition,
    [key, maybeValue]: schem.infer<typeof RecordEntry.schema>,
  ) {
    super(pos)
    this.key = key.value
    this.value = maybeValue ? maybeValue[1] : key
  }

  toString () {
    return `${this.key}: ${this.value}`
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.tuple([
      schema.any,
      schema.guard(isExpression),
    ])),
  ])
}
