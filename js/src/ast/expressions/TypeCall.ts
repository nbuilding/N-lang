import schema, * as schem from '../../utils/schema'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { str } from '../../type-checker/types/builtins'

export class TypeCall extends Base implements Expression {
  value: Expression

  constructor (
    pos: BasePosition,
    [, expr]: schem.infer<typeof TypeCall.schema>,
  ) {
    super(pos, [expr])
    this.value = expr
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { exitPoint } = context.scope.typeCheck(this.value)
    return {
      type: str,
      exitPoint: exitPoint,
    }
  }

  toString (): string {
    return `type(${this.value})`
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isExpression),
    schema.any,
  ])
}
