import { ErrorType } from '../../type-checker/errors/Error'
import { ScopeBaseContext } from '../../type-checker/Scope'
import {
  ExpectEqualResult,
  NType,
  Unknown,
} from '../../type-checker/types/types'
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

  /**
   * Check a declaration given an ideal type, which may be omitted if the ideal
   * type isn't known. For example, a let statement will have an ideal type from
   * its expression, while a function expression argument will not have an ideal
   * type.
   *
   * Type annotation | Ideal type | Result
   * --------------- | ---------- | ------
   * A               | A          | ok (pattern type is A)
   * A               | B          | LET_TYPE_MISMATCH (pattern type is null)
   * A               | omitted    | ok (pattern type is A)
   * omitted         | A          | ok (pattern type is A)
   * omitted         | omitted    | TYPE_ANNOTATION_NEEDED (pattern type is null)
   * A               | null       | ok (pattern type is presumably A)
   * null            | A          | ok (pattern type is null (!) because the user might have a different explicit type annotation in mind)
   * null            | omitted    | ok (pattern type is null)
   * null or omitted | null       | ok (pattern type is null)
   */
  checkDeclaration (context: ScopeBaseContext, idealType?: NType | null): void {
    if (idealType === undefined && !this.type) {
      context.err({ type: ErrorType.TYPE_ANNOTATION_NEEDED })
      context.scope.checkPattern(this.pattern, null, true)
      return
    }
    const typeAnnotation = this.type
      ? context.scope.getTypeFrom(this.type).type
      : new Unknown()
    if (idealType && typeAnnotation) {
      const equal = typeAnnotation.expectEqual(idealType)
      if (equal !== ExpectEqualResult.Equal) {
        if (equal === ExpectEqualResult.NotEqual) {
          context.err({
            type: ErrorType.LET_TYPE_MISMATCH,
            annotation: typeAnnotation,
            expression: idealType,
          })
          context.scope.checkPattern(this.pattern, null, true)
          return
        }
      }
    }
    context.scope.checkPattern(this.pattern, typeAnnotation, true)
  }

  toString (): string {
    return this.type ? `${this.pattern}: ${this.type}` : `${this.pattern}`
  }

  static schema = schema.tuple([
    schema.guard(isPattern),
    schema.nullable(schema.tuple([schema.any, schema.guard(isType)])),
  ])
}
