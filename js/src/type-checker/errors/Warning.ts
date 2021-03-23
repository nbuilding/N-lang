import { Base, Return } from '../../ast/index'

export enum WarningType {
  /** The expression is used as a statement and not stored anywhere */
  UNUSED_EXPRESSION,

  /**
   * The expression or statement will never be evaluated because the function
   * exits from an inner expression
   */
  EXPRESSION_NEVER,

  /** An identifier starting with an underscore is being used */
  USED_UNDERSCORE_IDENTIFIER,

  /** All the statements following a return statement will never be run */
  STATEMENT_NEVER,
}

export type WarningNoBase = {
  type: WarningType.EXPRESSION_NEVER | WarningType.STATEMENT_NEVER
  exitPoint: Return
}

export interface Warning extends WarningNoBase {
  base: Base
}
