import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { unit } from '../../type-checker/types/builtins'
import { functionFromTypes, NRecord } from '../../type-checker/types/types'
import { AliasSpec } from '../../type-checker/types/TypeSpec'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Arguments } from '../declaration/Arguments'
import { Identifier } from '../literals/Identifier'
import { Block } from './Block'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
  StatementCompilationResult,
} from './Statement'

export class ClassDeclaration extends Base implements Statement {
  public: boolean
  name: Identifier
  arguments: Arguments
  body: Block
  private _type?: NRecord

  constructor (
    pos: BasePosition,
    [, pub, name, , args, , body]: schem.infer<typeof ClassDeclaration.schema>,
  ) {
    super(pos, [name, args, body])
    this.public = pub !== null
    this.name = name
    this.arguments = args
    this.body = body
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    const classType: NRecord = { type: 'record', types: new Map() }
    this._type = classType
    const classAlias = new AliasSpec(this.name.value, classType)
    context.defineType(this.name, classAlias, this.public)
    const scope = context.scope.inner({
      returnType: 'class',
      exportsAllowed: true,
    })
    if (!scope.exports) {
      throw new Error('Where are the exports?')
    }
    const paramTypes = []
    if (this.arguments.typeVars && this.arguments.typeVars.vars.length > 0) {
      context.err({ type: ErrorType.CLASS_NO_TYPEVAR })
      for (const typeVar of this.arguments.typeVars.vars) {
        scope.types.set(typeVar.value, 'error')
      }
    }
    for (const param of this.arguments.params) {
      paramTypes.push(scope.checkDeclaration(param))
    }
    if (paramTypes.length === 0) {
      paramTypes.push(unit)
    }
    scope.checkStatement(this.body)
    for (const exported of scope.exports.variables) {
      const type = scope.variables.get(exported)
      if (!type) throw new Error(`Where did the export go for ${exported}?`)
      classType.types.set(exported, type)
    }
    context.defineVariable(
      this.name,
      functionFromTypes([...paramTypes, classAlias.instance()]),
      this.public,
    )
    scope.end()
    return {}
  }

  compileStatement (scope: CompilationScope): StatementCompilationResult {
    const className = scope.context.genVarName(this.name.value)
    scope.names.set(this.name.value, className)
    const mangledKeys = scope.context.normaliseRecord(this._type!)
    return {
      statements: [
        ...scope.functionExpression(
          this.arguments,
          funcScope => [
            ...this.body.compileStatement(funcScope).statements,
            this._type!.types.size > 0
              ? `return { ${Array.from(
                  this._type!.types.keys(),
                  key => `${mangledKeys[key]}: ${scope.getName(key)}`,
                ).join(', ')} };`
              : // A class with no exported types is just an empty record and
                // can be optimised like an empty unit type. Fortunately, `var`
                // is undefined behaviour!
                '// Unit-like class',
          ],
          `var ${className} = `,
          ';',
        ),
      ],
    }
  }

  toString (): string {
    return `class${this.public ? ' pub' : ''} ${this.name} ${this.arguments} ${
      this.body
    }`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(Identifier),
    schema.any,
    schema.instance(Arguments),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])
}
