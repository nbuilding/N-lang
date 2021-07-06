import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { WarningType } from '../../type-checker/errors/Warning'
import { tryFunctions } from '../../type-checker/types/comparisons/compare-assignable'
import {
  iterableTypes,
  legacyIterableTypes,
} from '../../type-checker/types/operations'
import { unknown } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'
import { Expression, isExpression } from '../expressions/Expression'
import { Block } from './Block'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
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
    context.warn({
      type: WarningType.OLD_FOR,
    })
    const { type, exitPoint } = context.scope.typeCheck(this.value)
    const scope = context.scope.inner()
    const iteratedType = tryFunctions(legacyIterableTypes, [type])
    if (!iteratedType) {
      context.err({
        type: ErrorType.FOR_LEGACY_NOT_ITERABLE,
      })
    }
    scope.checkDeclaration(this.var, iteratedType || unknown)
    scope.checkStatement(this.body)
    scope.end()
    return { exitPoint }
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    const end = scope.context.genVarName('oldForEnd')
    const index = scope.context.genVarName('oldForIndex')
    const { statements: valueS, expression } = this.value.compile(scope)
    const loopScope = scope.inner()
    const declS = this.var.compileDeclaration(loopScope, index)
    return {
      statements: [
        ...valueS,
        `for (var ${index} = 0, ${end} = ${expression}; ${index} < ${end}; ++${index}) {`,
        ...scope.context.indent([
          ...declS,
          ...this.body.compileStatement(loopScope).statements,
        ]),
        '}',
      ],
    }
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
    const iteratedType = tryFunctions(iterableTypes, [type])
    if (!iteratedType) {
      context.err({
        type: ErrorType.FOR_NOT_ITERABLE,
      })
    }
    scope.checkDeclaration(this.var, iteratedType || unknown)
    scope.checkStatement(this.body)
    scope.end()
    return { exitPoint }
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    // For loops can only iterate over lists
    const iterable = scope.context.genVarName('forIterable')
    const index = scope.context.genVarName('forIndex')
    const { statements: valueS, expression } = this.value.compile(scope)
    const loopScope = scope.inner()
    const declS = this.var.compileDeclaration(
      loopScope,
      `${iterable}[${index}]`,
    )
    return {
      statements: [
        ...valueS,
        `for (var ${index} = 0, ${iterable} = ${expression}; ${index} < ${iterable}.length; ++${index}) {`,
        ...scope.context.indent([
          ...declS,
          ...this.body.compileStatement(loopScope).statements,
        ]),
        '}',
      ],
    }
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
