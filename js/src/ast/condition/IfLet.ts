import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'
import { Expression, isExpression } from '../expressions/Expression'
import { ConditionResult } from './Condition'

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

  checkIfLet (context: ScopeBaseContext): ConditionResult {
    const scope = context.scope.inner()
    const { type, exitPoint } = scope.typeCheck(this.expression)
    scope.checkDeclaration(this.declaration, type, { certain: false })
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
