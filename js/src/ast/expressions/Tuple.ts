import schema, * as schem from '../../utils/schema'
import {
  CompilationResult,
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'
import { Base, BasePosition } from '../base'
import { CompilationScope } from '../../compiler/CompilationScope'

export class Tuple extends Base implements Expression {
  values: Expression[]

  constructor (
    pos: BasePosition,
    [rawValues, value]: schem.infer<typeof Tuple.schema>,
  ) {
    const values = [...rawValues.map(([value]) => value), value]
    super(pos, values)
    this.values = values
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const types = []
    let exitPoint
    for (const value of this.values) {
      const { type, exitPoint: exit } = context.scope.typeCheck(value)
      types.push(type)
      if (!exitPoint) exitPoint = exit
    }
    // TODO: Is it possible for a tuple to contain just one item? (i.e. is this
    // enforced by syntax?)
    return { type: { type: 'tuple', types }, exitPoint }
  }

  compile (scope: CompilationScope): CompilationResult {
    const statements: string[] = []
    const expressions: string[] = []
    for (const value of this.values) {
      const { statements: s, expression } = value.compile(scope)
      statements.push(...s)
      expressions.push(expression)
    }
    return {
      statements,
      expression: `[${expressions.join(', ')}]`,
    }
  }

  toString (): string {
    return `(${this.values.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(
      schema.tuple([
        schema.guard(isExpression),
        schema.any,
        schema.any,
        schema.any,
      ]),
    ),
    schema.guard(isExpression),
    schema.any,
  ])
}
