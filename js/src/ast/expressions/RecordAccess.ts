import schema, * as schem from '../../utils/schema'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { AliasSpec, unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'

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
    const resolved = AliasSpec.resolve(type)
    if (resolved.type === 'record' || resolved.type === 'module') {
      const fieldType = resolved.types.get(this.field.value)
      if (!fieldType) {
        context.err({
          type: ErrorType.RECORD_NO_FIELD,
        })
      }
      return { type: fieldType || unknown, exitPoint }
    } else {
      if (resolved.type !== 'unknown') {
        context.err({
          type: ErrorType.ACCESS_FIELD_OF_NON_RECORD,
        })
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
