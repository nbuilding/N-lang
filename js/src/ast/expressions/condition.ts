import schema, * as schem from '../../utils/schema'
import { Expression, isExpression } from './Expression'
import { Base, BasePosition } from '../base'
import { Declaration } from '../declaration/Declaration'

export type Condition = Expression
  | IfLet
export function isCondition (value: any): value is Condition {
  return value instanceof IfLet || isExpression(value)
}

export class IfLet extends Base implements Expression {
  declaration: Declaration
  expression: Expression

  constructor (pos: BasePosition, [, declaration, , expression]: schem.infer<typeof IfLet.schema>) {
    super(pos, [expression])
    this.declaration = declaration
    this.expression = expression
  }

  toString () {
    return `let ${this.declaration} = ${this.expression}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
  ])
}
