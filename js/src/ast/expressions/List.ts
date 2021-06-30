import schema, * as schem from '../../utils/schema'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { compareEqualTypes } from '../../type-checker/types/comparisons/compare-equal'
import { list } from '../../type-checker/types/builtins'
import { unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'

export class List extends Base implements Expression {
  items: Expression[]

  constructor (
    pos: BasePosition,
    [, rawItems]: schem.infer<typeof List.schema>,
  ) {
    const items = rawItems
      ? [...rawItems[0].map(([item]) => item), rawItems[1]]
      : []
    super(pos, items)
    this.items = items
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const types = []
    let exitPoint
    for (const item of this.items) {
      const { type, exitPoint: exit } = context.scope.typeCheck(item)
      types.push(type)
      if (!exitPoint) exitPoint = exit
    }
    if (types.length === 0) {
      return { type: list.instance([unknown]), exitPoint }
    } else {
      const result = compareEqualTypes(types)
      if (result.error) {
        context.err({
          type: ErrorType.LIST_ITEMS_MISMATCH,
          error: result.error.result,
          index: result.error.index,
        })
      }
      return { type: list.instance([result.type]), exitPoint }
    }
  }

  toString (): string {
    return `[${this.items.join(', ')}]`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(schema.tuple([schema.guard(isExpression), schema.any])),
        schema.guard(isExpression),
        schema.any,
      ]),
    ),
    schema.any,
  ])
}
