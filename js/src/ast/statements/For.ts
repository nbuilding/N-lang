import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'
import { Expression, isExpression } from '../expressions/Expression'
import { Block } from './Block'
import { Statement } from './Statement'

export class OldFor extends Base implements Statement {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: schem.infer<typeof OldFor.schema>,
  ) {
    super(pos, [value, decl, block])
    this.value = value
    this.var = decl
    this.body = block
  }

  toString (): string {
    return `for ${this.var} ${this.value} ${this.body}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
      schema.any,
      schema.instance(Block),
      schema.any,
    ])
  }
}

export class For extends Base implements Statement {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: schem.infer<typeof For.schema>,
  ) {
    super(pos, [value, decl, block])
    this.value = value
    this.var = decl
    this.body = block
  }

  toString (): string {
    return `for (${this.var} in ${this.value}) ${this.body}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
      schema.any,
      schema.instance(Block),
      schema.any,
    ])
  }
}
