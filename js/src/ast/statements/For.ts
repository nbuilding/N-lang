import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { WarningType } from '../../type-checker/errors/Warning'
import { tryFunctions } from '../../type-checker/types/comparisons/compare-assignable'
import {
  iterableTypes,
  legacyIterableTypes,
} from '../../type-checker/types/operations'
import { NFunction, unknown } from '../../type-checker/types/types'
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

abstract class BaseFor extends Base implements Statement {
  value: Expression
  var: Declaration
  body: Block
  abstract iterableTypes: NFunction[]
  abstract notIterableError:
    | ErrorType.FOR_LEGACY_NOT_ITERABLE
    | ErrorType.FOR_NOT_ITERABLE

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: [
      unknown,
      Declaration,
      unknown,
      Expression,
      unknown,
      Block,
      unknown,
    ],
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
    const loopDoneName = scope.context.genVarName('done')
    const end = scope.context.genVarName('oldForEnd')
    const index = scope.context.genVarName('oldForIndex')

    const { statements: valueS, expression } = this.value.compile(scope)
    const loopScope = scope.inner()
    const loopBody = [
      ...this.var.compileDeclaration(loopScope, index),
      ...this.body.compileStatement(loopScope, loopDoneName).statements,
    ]
    if (scope.procedure && scope.procedure.didChildScopeUseAwait()) {
      const thenName = scope.context.genVarName('then')
      const step = scope.context.genVarName('oldForStep')
      scope.procedure.addToChain({
        statements: [
          ...valueS,
          `var ${index} = 0, ${end} = ${expression};`,
          `function ${loopDoneName}() {`,
          `  if (${index} < ${end}) {`,
          `    ++${index};`,
          `    ${step}();`,
          '  } else {',
          `    ${thenName}();`,
          '  }',
          '}',
          `function ${step}() {`,
          ...scope.context.indent(loopBody),
          '}',
          `${step}();`,
        ],
        thenName,
      })
      return {
        statements: [],
      }
    } else {
      return {
        statements: [
          ...valueS,
          `for (var ${index} = 0, ${end} = ${expression}; ${index} < ${end}; ++${index}) {`,
          ...scope.context.indent(loopBody),
          '}',
        ],
      }
    }
  }
}

export class OldFor extends BaseFor {
  iterableTypes = legacyIterableTypes
  notIterableError = ErrorType.FOR_LEGACY_NOT_ITERABLE as const

  constructor (pos: BasePosition, children: schem.infer<typeof OldFor.schema>) {
    super(pos, children)
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    context.warn({
      type: WarningType.OLD_FOR,
    })
    return super.checkStatement(context)
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

export class For extends BaseFor {
  iterableTypes = iterableTypes
  notIterableError = ErrorType.FOR_NOT_ITERABLE as const

  constructor (pos: BasePosition, children: schem.infer<typeof OldFor.schema>) {
    super(pos, children)
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    // TODO: GENERALISE
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
