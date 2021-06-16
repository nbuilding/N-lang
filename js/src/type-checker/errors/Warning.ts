import { Base, Return } from '../../ast/index'
import { isObjectLike } from '../../utils/type-guards'
import { BlockDisplay, InlineDisplay } from './ErrorDisplayer'

export enum WarningType {
  /**
   * Block: The expression or statement will never be evaluated because the
   * function exits from an inner expression
   */
  EXPRESSION_NEVER = 'expression-never',

  /** Identifier, VarStmt: An identifier starting with a _ has been used */
  USED_UNDERSCORE_IDENTIFIER = 'used-underscore-identifier',

  /** For: The old for syntax is deprecated */
  OLD_FOR = 'old-for',

  /** Variable is unused */
  UNUSED_VARIABLE = 'unused-variable',

  /** Type is unused */
  UNUSED_TYPE = 'unused-type',

  /** All the statements following a return statement will never be run */
  STATEMENT_NEVER = 'statement-never',
}

export type WarningMessage =
  | {
      type: WarningType.EXPRESSION_NEVER | WarningType.STATEMENT_NEVER
      exitPoint: Return
    }
  | {
      type: WarningType.USED_UNDERSCORE_IDENTIFIER
    }
  | {
      type: WarningType.UNUSED_VARIABLE | WarningType.UNUSED_TYPE
    }
  | {
      type: WarningType.OLD_FOR
    }

export interface Warning {
  message: WarningMessage
  base: Base
}

export function displayWarningMessage (
  { message: err }: Warning,
  display: (strings: TemplateStringsArray, ...items: InlineDisplay[]) => string,
): string | [string, ...(BlockDisplay | false)[]] {
  switch (err.type) {
    default: {
      const errorMessage: unknown = err
      return display`Warning ${String(
        isObjectLike(errorMessage) ? errorMessage.type : errorMessage,
      )}: Unfortunately, I don't have much information about this error.`
    }
  }
}
