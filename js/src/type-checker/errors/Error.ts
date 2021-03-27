import { Base } from '../../ast/index'
import { NType } from '../types/types'

export enum ErrorType {
  /** Variable is not defined in scope */
  UNDEFINED_VARIABLE,

  /** Type is not defined in scope */
  UNDEFINED_TYPE,

  /** The type from a let declaration does not match its expression */
  LET_TYPE_MISMATCH,

  /** The given module name for a type identifier is not a module */
  NOT_MODULE,

  /** A sub module is not exported by the parent module in a type identifier */
  NOT_EXPORTED,

  /** A function argument doesn't have a type annotation */
  TYPE_ANNOTATION_NEEDED,

  /** Calling a non-function */
  CALL_NON_FUNCTION,

  /** Giving too many arguments to a function */
  TOO_MANY_ARGS,

  /** Function parameter type does not match */
  ARG_TYPE_MISMATCH,

  /** Cannot resolve function type variable for last argument */
  UNRESOLVED_GENERIC,
}

export type ErrorMessage =
  | {
      type:
        | ErrorType.UNDEFINED_VARIABLE
        | ErrorType.UNDEFINED_TYPE
        | ErrorType.NOT_MODULE
      name: string
    }
  | {
      type: ErrorType.NOT_EXPORTED
      name: string
      exported: 'module' | 'type'
    }
  | ErrorType.TYPE_ANNOTATION_NEEDED
  | {
      type: ErrorType.LET_TYPE_MISMATCH
      annotation: NType
      expression: NType
    }
  | {
      type: ErrorType.CALL_NON_FUNCTION
      funcType: NType
    }
  | {
      type: ErrorType.TOO_MANY_ARGS
      funcType: NType
      argPos: number
    }
  | {
      type: ErrorType.ARG_TYPE_MISMATCH
      expect: NType
      given: NType
      funcType: NType
      argPos: number
    }
  | {
      type: ErrorType.UNRESOLVED_GENERIC
      funcType: NType
    }

export interface Error {
  message: ErrorMessage
  base: Base
}
