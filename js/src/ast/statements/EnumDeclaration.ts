import {
  EnumSpec,
  TypeSpec as NamedTypeSpec,
} from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { TypeSpec } from '../declaration/TypeSpec'
import { Identifier } from '../literals/Identifier'
import { isType, Type } from '../types/Type'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class EnumVariant extends Base {
  variant: Identifier
  types: Type[]

  constructor (
    pos: BasePosition,
    rawVariant: schem.infer<typeof EnumVariant.schema>,
  ) {
    const [variant, types] =
      rawVariant.length === 1
        ? [rawVariant[0], []]
        : [rawVariant[1], rawVariant[2].map(([, type]) => type)]
    super(pos, [variant, ...types])
    this.variant = variant
    this.types = types
  }

  toString (): string {
    return `<${this.variant}${this.types.map(type => ' ' + type).join('')}>`
  }

  static schema = schema.union([
    schema.tuple([
      schema.any,
      schema.instance(Identifier),
      schema.array(schema.tuple([schema.any, schema.guard(isType)])),
      schema.any,
    ]),
    schema.tuple([schema.instance(Identifier)]),
  ])
}

export class EnumDeclaration extends Base implements Statement {
  public: boolean
  typeSpec: TypeSpec
  variants: EnumVariant[]

  constructor (
    pos: BasePosition,
    [, pub, typeSpec, , [, variant, rawVariants]]: schem.infer<
      typeof EnumDeclaration.schema
    >,
  ) {
    const variants = [variant, ...rawVariants.map(([, variant]) => variant)]
    super(pos)
    this.public = pub !== null
    this.typeSpec = typeSpec
    this.variants = variants
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
    const typeSpec = new EnumSpec(
      this.typeSpec.name.value,
      // TODO: duplicate variants
      new Map(
        this.variants.map(variant => [
          variant.variant.value,
          variant.types.map(type => context.scope.getTypeFrom(type).type),
        ]),
      ),
      typeVars,
    )
    if (context.scope.types.has(this.typeSpec.name.value)) {
      // TODO: error about duplicate type
      context.scope.types.set(this.typeSpec.name.value, null)
    } else {
      context.scope.types.set(this.typeSpec.name.value, typeSpec)
      context.scope.unused.types.add(this.typeSpec.name.value)
    }
    if (this.public) {
      context.ensureExportsAllowed(names =>
        names.types.add(this.typeSpec.name.value),
      )
    }
    scope.end()
    return {}
  }

  toString (): string {
    return `type${this.public ? ' pub' : ''} ${
      this.typeSpec
    } = ${this.variants.join(' | ')}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(TypeSpec),
    schema.any,
    schema.tuple([
      schema.any,
      schema.instance(EnumVariant),
      schema.array(schema.tuple([schema.any, schema.instance(EnumVariant)])),
    ]),
  ])
}
