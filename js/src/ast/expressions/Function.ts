import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Arguments } from '../declaration/Arguments'
import { Block } from '../statements/Block'
import { isType, Type } from '../types/Type'

export class Function extends Base {
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
