import { ErrorType } from '../../type-checker/errors/Error'
import {
  AliasSpec,
  TypeSpec as NamedTypeSpec,
} from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { TypeSpec } from '../declaration/TypeSpec'
import { isType, Type } from '../types/Type'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class AliasDeclaration extends Base implements Statement {
  public: boolean
  typeSpec: TypeSpec
  type: Type

  constructor (
    pos: BasePosition,
    [, pub, typeSpec, , type]: schem.infer<typeof AliasDeclaration.schema>,
  ) {
    super(pos, [typeSpec, type])
    this.public = pub !== null
    this.typeSpec = typeSpec
    this.type = type
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const scope = context.scope.inner()
    const typeVars = []
    if (this.typeSpec.typeVars) {
      for (const { value: name } of this.typeSpec.typeVars.vars) {
        const typeVar = new NamedTypeSpec(name)
        typeVars.push(typeVar)
        if (scope.types.has(name)) {
          scope.types.set(name, 'error')
          context.err({
            type: ErrorType.DUPLICATE_TYPE_VAR,
            in: 'alias',
          })
        } else {
          scope.types.set(name, typeVar)
        }
      }
    }
    context.defineType(
      this.typeSpec.name,
      new AliasSpec(
        this.typeSpec.name.value,
        context.scope.getTypeFrom(this.type).type,
        typeVars,
      ),
      this.public,
    )
    scope.end()
    return {}
  }

  toString (): string {
    return `alias${this.public ? ' pub' : ''} ${this.typeSpec} = ${this.type}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(TypeSpec),
    schema.any,
    schema.guard(isType),
  ])
}
