import {
  iterableTypes,
  legacyIterableTypes,
} from '../../type-checker/types/operations'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'
import { Expression, isExpression } from '../expressions/Expression'
import { Block } from './Block'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class OldFor extends Base implements Statement {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: schem.infer<typeof OldFor.schema>,
  ) {
    super(pos, [decl, value, block])
    this.value = value
    this.var = decl
    this.body = block
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    const scope = context.scope.inner()
    if (type) {
      for (const iterableFunc of legacyIterableTypes) {
        const [errors, iterateOutType] = iterableFunc.given(type)
        if (errors.length === 0) {
          this.var.checkDeclaration(
            scope.getCheckStatementContext(this),
            iterateOutType,
          )
          return { exitPoint }
        }
      }
      // TODO: error about not iterable
    }
    this.var.checkDeclaration(context, null)
    return { exitPoint }
  }

  toString (): string {
    return `for ${this.var} ${this.value} ${this.body}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])
}

export class For extends Base implements Statement {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: schem.infer<typeof For.schema>,
  ) {
    super(pos, [decl, value, block])
    this.value = value
    this.var = decl
    this.body = block
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    const scope = context.scope.inner()
    if (type) {
      for (const iterableFunc of iterableTypes) {
        const [errors, iterateOutType] = iterableFunc.given(type)
        if (errors.length === 0) {
          this.var.checkDeclaration(
            scope.getCheckStatementContext(this),
            iterateOutType,
          )
          return { exitPoint }
        }
      }
      // TODO: error about not iterable
    }
    this.var.checkDeclaration(context, null)
    return { exitPoint }
  }

  toString (): string {
    return `for (${this.var} in ${this.value}) ${this.body}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])
}
