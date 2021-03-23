import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Arguments } from '../declaration/Arguments'
import { Block } from '../statements/Block'
import { isType, Type } from '../types/Type'
import { Expression, TypeCheckContext, TypeCheckResult } from './Expression'

export class Function extends Base implements Expression {
  arguments: Arguments
  returnType: Type
  body: Block

  constructor (
    pos: BasePosition,
    [params, , returnType, , body]: schem.infer<typeof Function.schema>
  ) {
    super(pos, [params, returnType, body])
    this.arguments = params
    this.returnType = returnType
    this.body = body
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }

  toString (): string {
    return `${this.arguments} -> ${this.returnType} ${this.body}`
  }

  static schema = schema.tuple([
    schema.instance(Arguments), // [ ... ]
    schema.any, // _ -> _
    schema.guard(isType),
    schema.any, // _ { _
    schema.instance(Block),
    schema.any, // _ }
  ])
}
