import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Condition, isCondition } from '../expressions/condition'
import { Block } from './Block'
import { isStatement, Statement } from './Statement'

export class IfStmt extends Base implements Statement {
  condition: Condition
  then: Block
  else: Block | Statement | null

  constructor (
    pos: BasePosition,
    [, condition, , ifThen, , ifElse]: schem.infer<typeof IfStmt.schema>,
  ) {
    super(pos, [condition, ifThen, ...(ifElse ? [ifElse[1]] : [])])
    this.condition = condition
    this.then = ifThen
    this.else = ifElse && ifElse[1]
  }

  toString () {
    return `if ${this.condition} ${this.then}`
      + (this.else ? ` else ${this.else}` : '')
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.guard(isCondition),
      schema.any,
      schema.instance(Block),
      schema.any,
      schema.nullable(schema.tuple([
        schema.any,
        schema.union([
          schema.instance(Block),
          schema.guard(isStatement),
        ]),
      ])),
    ])
  }
}
