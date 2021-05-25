import { ErrorType } from '../../type-checker/errors/Error'
import {
  functionFromTypes,
  FuncTypeVarSpec,
  substitute,
  TypeSpec,
  unknown,
} from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Arguments } from '../declaration/Arguments'
import { Block } from '../statements/Block'
import { isType, Type } from '../types/Type'
import { Expression, TypeCheckContext, TypeCheckResult } from './Expression'

export class Function extends Base implements Expression {
  arguments: Arguments
  returnType: Type
  body: Block

  constructor (
    pos: BasePosition,
    [params, , returnType, , body]: schem.infer<typeof Function.schema>,
  ) {
    super(pos, [params, returnType, body])
    this.arguments = params
    this.returnType = returnType
    this.body = body
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const typeVarScope = context.scope.inner()
    const typeVars = []
    if (this.arguments.typeVars) {
      for (const typeVarName of this.arguments.typeVars.vars) {
        const typeVar = new TypeSpec(typeVarName.value)
        typeVars.push(typeVar)
        if (typeVarScope.types.has(typeVarName.value)) {
          typeVarScope.types.set(typeVarName.value, null)
          context.err({
            type: ErrorType.DUPLICATE_TYPE_VAR,
            in: 'func-expr',
          })
        } else {
          typeVarScope.types.set(typeVarName.value, typeVar)
        }
      }
    }
    const paramTypes = []
    for (const param of this.arguments.params) {
      paramTypes.push(typeVarScope.checkDeclaration(param))
    }
    const returnType = typeVarScope.getTypeFrom(this.returnType).type
    const scope = typeVarScope.inner({ returnType })
    // TODO: May want to delay type checking body? (if param length > 0)
    scope.checkStatement(this.body)
    scope.end()
    typeVarScope.end()

    const substitutions = new Map()
    if (paramTypes.length === 0) {
      for (const typeVar of typeVars) {
        substitutions.set(typeVar, unknown)
      }
      return { type: substitute(returnType, substitutions) }
    } else {
      const funcTypeVars = []
      for (const typeVar of typeVars) {
        const funcTypeVar = new FuncTypeVarSpec(typeVar.name)
        substitutions.set(typeVar, funcTypeVar)
        funcTypeVars.push(funcTypeVar)
      }
      return {
        type: functionFromTypes([
          ...paramTypes.map(param => substitute(param, substitutions)),
          substitute(returnType, substitutions),
        ]),
      }
    }
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
