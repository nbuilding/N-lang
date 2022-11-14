import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import { ScopeBaseContext } from '../../type-checker/ScopeBaseContext';
import { NType, unknown } from '../../type-checker/types/types';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { isPattern, Pattern } from '../patterns/Pattern';
import { isType, Type } from '../types/Type';

export interface DeclarationOptions {
  public?: boolean;
  certain?: boolean;
  mutable?: boolean;
}

export class Declaration extends Base {
  pattern: Pattern;
  type: Type | null;

  constructor(
    pos: BasePosition,
    [pattern, maybeType]: schem.infer<typeof Declaration.schema>,
  ) {
    const type = maybeType && maybeType[1];
    super(pos, [pattern, type]);
    this.pattern = pattern;
    this.type = type;
  }

  /**
   * Check a declaration given a value type, which may be omitted if there isn't
   * a value type. For example, a let statement will have a value type from its
   * expression, while a function expression argument will not have a value
   * type.
   *
   * Type annotation | Value type | Result
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
  checkDeclaration(
    context: ScopeBaseContext,
    valueType?: NType,
    {
      certain = true,
      public: isPublic = false,
      mutable: isMutable = false,
    }: DeclarationOptions = {},
  ): NType {
    const typeAnnotation: NType = this.type
      ? context.scope.getTypeFrom(this.type).type
      : valueType || unknown;
    if (
      valueType &&
      context.isTypeError(ErrorType.LET_MISMATCH, typeAnnotation, valueType)
    ) {
      context.scope.checkPattern(
        this.pattern,
        unknown,
        certain,
        isPublic,
        isMutable,
      );
    } else {
      context.scope.checkPattern(
        this.pattern,
        typeAnnotation,
        certain,
        isPublic,
        isMutable,
      );
    }
    if (
      valueType?.type == 'named' &&
      valueType.typeSpec.requiresMutable &&
      !isMutable
    ) {
      context.err({
        type: ErrorType.TYPE_REQUIRE_MUTABLE,
      });
    }
    return typeAnnotation;
  }

  /** `resultName` is null if the pattern is certain. */
  compileDeclaration(
    scope: CompilationScope,
    valueName: string,
    resultName: string | null = null,
  ): string[] {
    const { statements, varNames } = this.pattern.compilePattern(
      scope,
      valueName,
    );
    if (resultName) {
      return [
        `var ${[`${resultName} = false`, ...varNames].join(', ')};`,
        'do {',
        ...scope.context.indent([...statements, `${resultName} = true;`]),
        `} while (false);`,
      ];
    } else {
      return varNames.length > 0
        ? [`var ${varNames.join(', ')};`, ...statements]
        : statements;
    }
  }

  toString(): string {
    return this.type ? `${this.pattern}: ${this.type}` : `${this.pattern}`;
  }

  static schema = schema.tuple([
    schema.guard(isPattern),
    schema.nullable(schema.tuple([schema.any, schema.guard(isType)])),
  ]);
}
