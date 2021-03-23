import schema, * as schem from '../../utils/schema'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'

export class List extends Base {
  items: Expression[]

  constructor (
    pos: BasePosition,
    [, rawItems]: schem.infer<typeof List.schema>,
  ) {
    const items = rawItems ? [
      ...rawItems[0].map(([item]) => item),
      rawItems[1],
    ] : []
    super(pos, items)
    this.items = items
  }

  toString () {
    return `[${this.items.join(', ')}]`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.guard(isExpression),
        schema.any,
      ])),
      schema.guard(isExpression),
      schema.any,
    ])),
    schema.any,
  ])
}
