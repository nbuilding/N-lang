import { CompilationScope } from "../../compiler/CompilationScope"
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from "../base"
import { Expression, TypeCheckContext, TypeCheckResult, CompilationResult, isExpression } from "./Expression"

export class Spread extends Base implements Expression {
  value: Expression

  constructor (
    pos: BasePosition,
    [, value]: schem.infer<typeof Spread.schema>,
  ) {
    super(pos, [value])
    this.value = value
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    return context.scope.typeCheck(this.value)
  }

  compile (scope: CompilationScope): CompilationResult {
    return this.value.compile(scope)
  }

  toString (): string {
    return `..${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isExpression),
  ])
}
