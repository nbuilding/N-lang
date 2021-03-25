import { ScopeBaseContext } from '../../type-checker/Scope'
import { NType } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { isPattern, Pattern } from '../patterns/Pattern'
import { isType, Type } from '../types/Type'

export class Declaration extends Base {
  pattern: Pattern
  type: Type | null

  constructor (
    pos: BasePosition,
    [pattern, maybeType]: schem.infer<typeof Declaration.schema>,
  ) {
    const type = maybeType && maybeType[1]
    super(pos, [pattern, type])
    this.pattern = pattern
    this.type = type
  }

  checkDeclaration (context: ScopeBaseContext, idealType: NType): void {
    if (this.type) {
      const typeAnnotation = context.scope.getTypeFrom(this.type)
    }
  }

  toString (): string {
    return this.type ? `${this.pattern}: ${this.type}` : `${this.pattern}`
  }

  static schema = schema.tuple([
    schema.guard(isPattern),
    schema.nullable(schema.tuple([schema.any, schema.guard(isType)])),
  ])
}
