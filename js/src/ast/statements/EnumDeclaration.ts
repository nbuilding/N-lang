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
  variant: string
  types: Type[] = []

  constructor (
    pos: BasePosition,
    variant: schem.infer<typeof EnumVariant.schema>,
  ) {
    super(pos)
    if (variant.length === 1) {
      this.variant = variant[0].value
    } else {
      this.variant = variant[1].value
      this.types = variant[2].map(([, type]) => type)
    }
  }

  toString () {
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
    [, pub, typeSpec, , [, variant, variants]]: schem.infer<
      typeof EnumDeclaration.schema
    >,
  ) {
    super(pos)
    this.public = pub !== null
    this.typeSpec = typeSpec
    this.variants = [variant, ...variants.map(([, variant]) => variant)]
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    throw new Error('Method not implemented.')
  }

  toString () {
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
