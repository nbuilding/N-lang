import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
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
  StatementCompilationResult,
} from './Statement'

export class EnumVariant extends Base {
  public: boolean
  variant: Identifier
  types: Type[]

  constructor (
    pos: BasePosition,
    [pub, rawVariant]: schem.infer<typeof EnumVariant.schema>,
  ) {
    const [variant, types] =
      rawVariant.length === 1
        ? [rawVariant[0], []]
        : [rawVariant[1], rawVariant[2].map(([, type]) => type)]
    super(pos, [variant, ...types])
    this.public = pub !== null
    this.variant = variant
    this.types = types
  }

  toString (): string {
    return `<${this.variant}${this.types.map(type => ' ' + type).join('')}>`
  }

  static schema = schema.tuple([
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.union([
      schema.tuple([
        schema.any,
        schema.instance(Identifier),
        schema.array(schema.tuple([schema.any, schema.guard(isType)])),
        schema.any,
      ]),
      schema.tuple([schema.instance(Identifier)]),
    ]),
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
        if (scope.types.has(name)) {
          scope.types.set(name, 'error')
          context.err({
            type: ErrorType.DUPLICATE_TYPE_VAR,
            in: 'enum',
          })
        } else {
          scope.types.set(name, typeVar)
        }
      }
    }
    const typeSpec = new EnumSpec(this.typeSpec.name.value, new Map(), typeVars)
    for (const variant of this.variants) {
      const types = variant.types.map(
        type => context.scope.getTypeFrom(type).type,
      )
      const existingVariant = typeSpec.variants.get(variant.variant.value)
      if (existingVariant) {
        context.err(
          {
            type: ErrorType.DUPLICATE_VARIANT,
          },
          variant.variant,
        )
        typeSpec.variants.set(variant.variant.value, {
          types: null,
          public: variant.public || existingVariant.public,
        })
      } else {
        typeSpec.variants.set(variant.variant.value, {
          types,
          public: variant.public,
        })
      }
      context.defineVariable(
        variant.variant,
        typeSpec.getConstructorType(variant.variant.value),
        variant.public && !this.public,
      )
    }
    context.defineType(this.typeSpec.name, typeSpec, this.public)
    scope.end()
    return {}
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    throw new Error('Method not implemented.')
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
