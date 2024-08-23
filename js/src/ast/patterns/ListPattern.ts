import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import { list } from '../../type-checker/types/builtins';
import { NType, unknown } from '../../type-checker/types/types';
import { AliasSpec } from '../../type-checker/types/TypeSpec';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
  PatternCompilationResult,
} from './Pattern';

export class ListPattern extends Base implements Pattern {
  patterns: Pattern[];

  constructor(
    pos: BasePosition,
    [, rawPatterns]: schem.infer<typeof ListPattern.schema>,
  ) {
    const patterns = rawPatterns
      ? [...rawPatterns[0].map(([pattern]) => pattern), rawPatterns[1]]
      : [];
    super(pos, patterns);
    this.patterns = patterns;
  }

  checkPattern(context: CheckPatternContext): CheckPatternResult {
    let innerType: NType = unknown;
    const resolved = AliasSpec.resolve(context.type);
    if (resolved.type === 'named' && resolved.typeSpec === list) {
      innerType = resolved.typeVars[0];
    } else if (resolved.type !== 'unknown') {
      context.err({
        type: ErrorType.PATTERN_MISMATCH,
        assignedTo: resolved,
        destructure: 'list',
      });
    }
    if (context.definite) {
      context.err({
        type: ErrorType.LIST_PATTERN_DEFINITE,
        items: this.patterns.length,
      });
    }
    for (const pattern of this.patterns) {
      context.checkPattern(pattern, innerType);
    }
    return {};
  }

  compilePattern(
    scope: CompilationScope,
    valueName: string,
  ): PatternCompilationResult {
    const statements: string[] = [];
    const varNames: string[] = [];
    this.patterns.forEach((pattern, i) => {
      const { statements: s, varNames: v } = pattern.compilePattern(
        scope,
        `${valueName}[${i}]`,
      );
      statements.push(...s);
      varNames.push(...v);
    });
    return {
      statements: [
        `if (${valueName}.length === ${this.patterns.length}) {`,
        ...scope.context.indent(statements),
        '} else break;',
      ],
      varNames,
    };
  }

  toString(): string {
    return `[${this.patterns.join(', ')}]`;
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(schema.tuple([schema.guard(isPattern), schema.any])),
        schema.guard(isPattern),
        schema.any,
      ]),
    ),
    schema.any,
  ]);
}
