import { ErrorType } from '../../type-checker/errors/Error'
import { bool } from '../../type-checker/types/builtins'
import { expectEqual } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Condition, isCondition } from '../condition/Condition'
import { IfLet } from '../condition/IfLet'
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
    let exitPoint
    if (this.condition instanceof IfLet) {
      ;({ exitPoint } = this.condition.checkIfLet(context))
    } else {
      const {
        type: condType,
        exitPoint: exitPointCond,
      } = context.scope.typeCheck(this.condition)
      exitPoint = exitPointCond
      if (condType) {
        const errors = expectEqual(bool.instance(), condType)
        if (errors.length > 0) {
          context.err({
            type: ErrorType.CONDITION_NOT_BOOL,
            expression: condType,
            errors,
          })
        }
      }
    }
    // TODO: Shouldn't there be a warning if the exit point is in the condition?
    const { exitPoint: exitPointLeft } = context.scope.checkStatement(this.then)
    if (!exitPoint) exitPoint = exitPointLeft
    if (this.else) {
      const { exitPoint: exitPointRight } = context.scope.checkStatement(
        this.else,
      )
      if (!exitPoint) exitPoint = exitPointRight
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
