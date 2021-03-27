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

  /** Pattern can't destructure type */
  DESTRUCTURE_TYPE_MISMATCH,

  /** Destructuring an enum with a nonexistent variant */
  ENUM_DESTRUCTURE_NO_VARIANT,

  /** Destructuring an enum with multiple variants as a definite pattern */
  ENUM_DESTRUCTURE_DEFINITE_MULT_VARIANTS,

  /** The number of destructured fields and the variant fields don't match */
  ENUM_DESTRUCTURE_FIELD_MISMATCH,

  /** Destructuring a list as a definite pattern */
  LIST_DESTRUCTURE_DEFINITE,

  /** Destructuring a nonexistent key from a record */
  RECORD_DESTRUCTURE_NO_KEY,

  /** Destructuring a duplicate key from a record; TODO: Is this an error? */
  RECORD_DESTRUCTURE_DUPLICATE_KEY,

  /** Not all fields of record destructured */
  RECORD_DESTRUCTURE_INCOMPLETE,

  /** The number of items destructured from the tuple doesn't match its length */
  TUPLE_DESTRUCTURE_LENGTH_MISMATCH,
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
  | {
      type: ErrorType.TYPE_ANNOTATION_NEEDED
    }
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
  | {
      type: ErrorType.DESTRUCTURE_TYPE_MISMATCH
      assignedTo: NType
      destructure: 'enum' | 'list' | 'tuple' | 'record'
    }
  | {
      type:
        | ErrorType.ENUM_DESTRUCTURE_NO_VARIANT
        | ErrorType.ENUM_DESTRUCTURE_DEFINITE_MULT_VARIANTS
        | ErrorType.LIST_DESTRUCTURE_DEFINITE
    }
  | {
      type:
        | ErrorType.ENUM_DESTRUCTURE_FIELD_MISMATCH
        | ErrorType.TUPLE_DESTRUCTURE_LENGTH_MISMATCH
      assignedTo: number
    }
  | {
      type: ErrorType.RECORD_DESTRUCTURE_NO_KEY
      recordType: NType
      key: string
    }
  | {
      type: ErrorType.RECORD_DESTRUCTURE_DUPLICATE_KEY
      key: string
    }
  | {
      type: ErrorType.RECORD_DESTRUCTURE_INCOMPLETE
      keys: string[]
    }

export interface Error {
  message: ErrorMessage
  base: Base
}
