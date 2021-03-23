import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import { from } from '../../grammar/from-nearley'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'

export class FuncCall extends Base {
  func: Expression
  params: Expression[]

  constructor (
    pos: BasePosition,
    [func, , maybeParams]: schem.infer<typeof FuncCall.schema>,
  ) {
    const params = maybeParams ? [
      ...maybeParams[0].map(([param]) => param),
      maybeParams[1],
    ] : []
    super(pos, [func, ...params])
    this.func = func
    this.params = params
  }

  toString () {
    return `${this.func}(${this.params.join(', ')})`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
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
