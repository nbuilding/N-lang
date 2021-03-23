import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { TypeSpec } from '../declaration/TypeSpec'
import { isType, Type } from '../types/Type'
import { CheckStatementContext, CheckStatementResult, Statement } from './Statement'

export class AliasDeclaration extends Base implements Statement {
  public: boolean
  typeSpec: TypeSpec
  type: Type

  constructor (
    pos: BasePosition,
    [, pub, typeSpec, , type]: schem.infer<typeof AliasDeclaration.schema>,
  ) {
    super(pos)
    this.public = pub !== null
    this.typeSpec = typeSpec
    this.type = type
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    throw new Error('Method not implemented.')
  }

  toString () {
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
