import schema, * as schem from '../../utils/schema'
import { isToken } from '../../utils/type-guards'
import { Base, BasePosition } from '../base'
import {
  Expression,
  TypeCheckContext,
  TypeCheckResult,
} from '../expressions/Expression'

export abstract class Literal extends Base implements Expression {
  value: string

  constructor (pos: BasePosition, [str]: schem.infer<typeof Literal.schema>) {
    super(pos)
    this.value = str.value
  }

  abstract typeCheck (context: TypeCheckContext): TypeCheckResult

  toString (): string {
    return this.value
  }

  static schema = schema.tuple([schema.guard(isToken)])
}
