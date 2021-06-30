import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { checkCondition, Condition, isCondition } from '../condition/Condition'
import { Block } from './Block'
import {
  CheckStatementContext,
  CheckStatementResult,
  isStatement,
  Statement,
} from './Statement'

export class IfStmt extends Base implements Statement {
  condition: Condition
  then: Block
  else: Block | Statement | null

  constructor (
    pos: BasePosition,
    [, condition, , ifThen, , ifElse]: schem.infer<typeof IfStmt.schema>,
  ) {
    super(pos, [condition, ifThen, ifElse && ifElse[1]])
    this.condition = condition
    this.then = ifThen
    this.else = ifElse && ifElse[1]
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { exitPoint: condExit, scope } = checkCondition(
      context,
      this.condition,
    )
    const { exitPoint: thenExit } = scope.checkStatement(this.then)
    scope.end()
    let exitPoint = condExit || thenExit
    if (this.else) {
      const scope = context.scope.inner()
      const { exitPoint: elseExit } = scope.checkStatement(this.else)
      if (!exitPoint) exitPoint = elseExit
      scope.end()
    }
    return {
      exitPoint,
    }
  }

  toString (): string {
    return (
      `if ${this.condition} ${this.then}` +
      (this.else ? ` else ${this.else}` : '')
    )
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isCondition),
    schema.any,
    schema.instance(Block),
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.any,
        schema.union([schema.instance(Block), schema.guard(isStatement)]),
      ]),
    ),
  ])
}
