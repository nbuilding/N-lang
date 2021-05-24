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
        // TODO: duplicate type var names
        scope.types.set(name, typeVar)
      }
    }
    const typeSpec = new AliasSpec(
      this.typeSpec.name.value,
      context.scope.getTypeFrom(this.type).type,
      typeVars,
    )
    if (context.scope.types.has(this.typeSpec.name.value)) {
      // TODO: error about duplicate type
      context.scope.types.set(this.typeSpec.name.value, null)
    } else {
      context.scope.types.set(this.typeSpec.name.value, typeSpec)
      context.scope.unusedTypes.add(this.typeSpec.name.value)
    }
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
