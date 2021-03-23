import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import { from } from '../../grammar/from-nearley'
import { Expression } from './Expression'
import { Base, BasePosition } from '../base'

export class Tuple extends Base implements Expression {
  values: Expression[]

  constructor (pos: BasePosition, [values, value]: schem.infer<typeof Tuple.schema>) {
    super(pos)
    this.values = [
      ...values.map(([value]) => value),
      value,
    ]
  }

  toString () {
    return `(${this.values.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.any,
      schema.any,
    ])),
    schema.guard(isExpression),
    schema.any,
  ])
}
