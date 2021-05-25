import { Base, Return } from '../../ast/index'

export enum WarningType {
  /**
   * The expression or statement will never be evaluated because the function
   * exits from an inner expression
   */
  EXPRESSION_NEVER = 'expression-never',

  /** An identifier starting with an underscore is being used */
  USED_UNDERSCORE_IDENTIFIER = 'used-underscore-identifier',

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

export interface Warning {
  message: WarningMessage
  base: Base
}
