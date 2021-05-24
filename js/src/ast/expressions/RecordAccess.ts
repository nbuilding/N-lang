import schema, * as schem from '../../utils/schema'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { unknown } from '../../type-checker/types/types'

export class RecordAccess extends Base implements Expression {
  value: Expression
  field: Identifier

  constructor (
    pos: BasePosition,
    [value, , field]: schem.infer<typeof RecordAccess.schema>,
  ) {
    super(pos, [value, field])
    this.value = value
    this.field = field
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    if (type.type === 'record') {
      const fieldType = type.types.get(this.field.value)
      if (!fieldType) {
        // TODO: Record doesn't have field
      }
      return { type: fieldType || unknown, exitPoint }
    } else {
      if (type.type !== 'unknown') {
        // TODO: Cannot get field of non-record
      }
      return { type: unknown, exitPoint }
    }
  }

  toString (): string {
    return `${this.value}.${this.field}`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
    schema.any,
    schema.instance(Identifier),
  ])
}
