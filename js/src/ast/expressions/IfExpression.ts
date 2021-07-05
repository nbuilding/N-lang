import schema, * as schem from '../../utils/schema'
import {
  CompilationResult,
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import {
  checkCondition,
  compileCondition,
  Condition,
  isCondition,
} from '../condition/Condition'
import { compareEqualTypes } from '../../type-checker/types/comparisons/compare-equal'
import { ErrorType } from '../../type-checker/errors/Error'
import { CompilationContext } from '../../compiler/CompilationContext'
import { NType } from '../../type-checker/types/types'
import { CompilationScope } from '../../compiler/CompilationScope'

export class IfExpression extends Base implements Expression {
  condition: Condition
  then: Expression
  else: Expression

  constructor (
    pos: BasePosition,
    [, condition, , ifThen, , ifElse]: schem.infer<typeof IfExpression.schema>,
  ) {
    super(pos, [condition, ifThen, ifElse])
    this.condition = condition
    this.then = ifThen
    this.else = ifElse
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const { exitPoint: condExit, scope } = checkCondition(
      context,
      this.condition,
    )
    const { type: thenType, exitPoint: thenExit } = scope.typeCheck(this.then)
    const { type: elseType, exitPoint: elseExit } = context.scope.typeCheck(
      this.else,
    )
    const exitPoint = condExit || thenExit || elseExit
    const result = compareEqualTypes([thenType, elseType])
    if (result.error) {
      context.err({
        type: ErrorType.IF_BRANCH_MISMATCH,
        error: result.error.result,
      })
    }
    return { type: result.type, exitPoint }
  }

  compile (scope: CompilationScope): CompilationResult {
    const { statements: condS, result, scope: thenScope } = compileCondition(
      scope,
      this.condition,
    )
    const { statements: thenS, expression: thenE } = this.then.compile(
      thenScope,
    )
    const { statements: elseS, expression: elseE } = this.else.compile(
      scope.inner(),
    )
    if (thenS.length === 0 && elseS.length === 0) {
      return {
        statements: condS,
        expression: `${result} ? ${thenE} : ${elseE}`,
      }
    } else {
      const result = scope.context.genVarName('ifCond')
      return {
        statements: [
          ...condS,
          `var ${result};`,
          `if (${result}) {`,
          ...scope.context.indent([...thenS, `${result} = ${thenE};`]),
          `} else {`,
          ...scope.context.indent([...elseS, `${result} = ${elseE};`]),
          `}`,
        ],
        expression: result,
      }
    }
  }

  toString (): string {
    return (
      `if ${this.condition} { ${this.then} }` +
      (this.else ? ` else { ${this.else} }` : '')
    )
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isCondition),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.guard(isExpression),
  ])
}
