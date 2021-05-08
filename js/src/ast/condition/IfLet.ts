import { Scope, ScopeBaseContext } from '../../type-checker/Scope'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'
import { Expression, isExpression } from '../expressions/Expression'
import { Return } from '../expressions/Return'

interface IfLetResult {
  scope: Scope
  exitPoint?: Return
}

export class IfLet extends Base {
  declaration: Declaration
  expression: Expression

  constructor (
    pos: BasePosition,
    [, declaration, , expression]: schem.infer<typeof IfLet.schema>,
  ) {
    super(pos, [declaration, expression])
    this.declaration = declaration
    this.expression = expression
  }

  checkIfLet (context: ScopeBaseContext): IfLetResult {
    const scope = context.scope.inner()
    const { type, exitPoint } = scope.typeCheck(this.expression)
    scope.checkDeclaration(this.declaration, type, false)
    return { scope, exitPoint }
  }

  toString (): string {
    return `let ${this.declaration} = ${this.expression}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
  ])
}
