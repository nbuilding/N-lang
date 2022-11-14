import { Base, Return } from '../../ast/index';
import { isObjectLike } from '../../utils/type-guards';
import { BlockDisplay, HINT, InlineDisplay } from './ErrorDisplayer';

export enum WarningType {
  /**
   * Block: The expression or statement will never be evaluated because the
   * function exits from an inner expression.
   */
  EXPRESSION_NEVER = 'expression-never',

  /** Scope: Identifier is unused. */
  UNUSED = 'unused',

  /** Identifier, VarStmt, ModuleId: Using an identifier starting with a _. */
  USED_UNDERSCORE_IDENTIFIER = 'used-underscore-identifier',

  /** ScopeBaseContext: Exporting an identifier starting with a _ */
  EXPORT_UNDERSCORE = 'export-underscore',

  /** For: The old for syntax is deprecated. */
  OLD_FOR = 'old-for',

  /** VarStmt: `var` is undefined behaviour. */
  VAR_UNSAFE = 'var-unsafe',

  /** ScopeBaseContext: Exporting a type inside a class. */
  CLASS_EXPORT_TYPE = 'class-export-type',

  /** All the statements following a return statement will never be run. */
  STATEMENT_NEVER = 'statement-never',
}

export type WarningMessage =
  | {
      type: WarningType.EXPRESSION_NEVER | WarningType.STATEMENT_NEVER;
      exitPoint: Return;
    }
  | {
      type:
        | WarningType.UNUSED
        | WarningType.USED_UNDERSCORE_IDENTIFIER
        | WarningType.EXPORT_UNDERSCORE;
      name: string;
      value: 'type' | 'variable';
    }
  | {
      type:
        | WarningType.OLD_FOR
        | WarningType.CLASS_EXPORT_TYPE
        | WarningType.VAR_UNSAFE;
    };

export interface Warning {
  message: WarningMessage;
  base: Base;
}

export function displayWarningMessage(
  { message: err, base }: Warning,
  display: (strings: TemplateStringsArray, ...items: InlineDisplay[]) => string,
): string | [string, ...(BlockDisplay | false)[]] {
  switch (err.type) {
    case WarningType.CLASS_EXPORT_TYPE: {
      return display`Exporting a type inside a class is allowed, but it does not do anything. We may disallow this in a future version of N.`;
    }
    case WarningType.OLD_FOR: {
      return [
        display`The old ${'for'} loop syntax is deprecated and will be removed in a future version of N.`,
        base,
        display`${HINT}: Use the equivalent modern ${'for'} loop syntax: ${'for (value in range(0, end, 1)) { ... }'}.`,
      ];
    }
    case WarningType.UNUSED: {
      return [
        display`You declared ${err.name} but never used it.`,
        base,
        err.value === 'variable'
          ? display`${HINT}: If this is intentional, add an underscore (${'_'}) in front of the variable name: ${
              '_' + err.name
            }.`
          : display`${HINT}: If this is intentional, add an underscore (${'_'}) in front of the type name: ${
              '_' + err.name
            }.`,
      ];
    }
    case WarningType.EXPORT_UNDERSCORE:
    case WarningType.USED_UNDERSCORE_IDENTIFIER: {
      return [
        display`You used ${
          err.name
        }, whose name starts with an underscore (${'_'}).`,
        base,
        `The underscore means that the ${
          err.value
        } was intentionally unused, but now that you are ${
          err.type === WarningType.EXPORT_UNDERSCORE ? 'exporting' : 'using'
        } it, you don't need the underscore.`,
        display`${HINT}: If you want to use or export ${
          err.name
        }, remove the underscore: ${err.name.replace(/^_+/, '')}.`,
      ];
    }
    case WarningType.VAR_UNSAFE: {
      return display`Mutating a variable inside a ${'cmd'} is unsafe and can lead to race conditions, please use the ${'mutex'} library instead to avoid them.`;
    }
    default: {
      const errorMessage: unknown = err;
      return display`Warning ${String(
        isObjectLike(errorMessage) ? errorMessage.type : errorMessage,
      )}: Unfortunately, I don't have much information about this error.`;
    }
  }
}
