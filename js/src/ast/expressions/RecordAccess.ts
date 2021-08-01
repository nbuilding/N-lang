import schema, * as schem from '../../utils/schema'
import {
  CompilationResult,
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { NModule, NRecord, unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'
import { CompilationScope } from '../../compiler/CompilationScope'
import { AliasSpec } from '../../type-checker/types/TypeSpec'

export class RecordAccess extends Base implements Expression {
  value: Expression
  field: Identifier
  private _type?: NRecord | NModule

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
      this._type = resolved
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

  compile (scope: CompilationScope): CompilationResult {
    const { statements, expression } = this.value.compile(scope)
    const type = this._type!
    if (type.type === 'record') {
      const mangledKeys = scope.context.normaliseRecord(type)
      return {
        statements,
        expression: `(${expression}).${mangledKeys[this.field.value]}`,
      }
    } else {
      const exportName = scope.context
        .getModule(type.path)
        .names.get(this.field.value)
      if (!exportName) {
        throw new ReferenceError(
          `Module ${type.path} does not define such name ${this.field.value}`,
        )
      }
      return {
        statements,
        expression: exportName,
      }
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
