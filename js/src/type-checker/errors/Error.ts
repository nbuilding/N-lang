import { Base } from '../../ast/index'
import { NType } from '../types/types'

export enum ErrorType {
  /** Variable is not defined in scope */
  UNDEFINED_VARIABLE,

  /** Type is not defined in scope */
  UNDEFINED_TYPE,

  /** The operation cannot be performed between the two types */
  OPERATION_NONE_FOR_TYPES,

  /** The unary operation cannot be performed for the type */
  UNARY_OPERATION_NONE_FOR_TYPE,

  /** The comparison is between different types */
  COMPARISON_DIFFERENT_TYPES,

  /** The type cannot be compared for equality (eg functions) */
  EQUALITY_UNAVAILABLE,

  /** The type cannot be compared for order */
  COMPARISON_UNAVAILABLE,

  /** Performing a function call on a non-function */
  CALLING_NON_FUNCTION,

  /** Argument type does not match */
  ARGUMENT_TYPE_MISMATCH,

  /** Extra arguments */
  ARGUMENT_EXTRA,

  /** Using the return statement outside a function */
  RETURN_OUTSIDE_FUNCTION,

  /** Return statement's expression does not match with function return type */
  RETURN_TYPE_MISMATCH,

  /** The if condition is not a boolean */
  CONDITION_NOT_BOOLEAN,

  /** The if-else branch types do not match */
  IF_ELSE_BRANCH_TYPE_MISMATCH,

  /** The function argument type is omitted */
  FUNCTION_NO_INFERRED_ARGUMENT,

  /** The function argument name is already used */
  FUNCTION_DUPLICATE_ARGUMENT,

  /** The iterated type does not match the iterated type from the iterator */
  ITERATED_TYPE_MISMATCH,

  /** The iterator value in a for loop is not iterable */
  ITERATOR_NOT_ITERABLE,

  /** An import or variable has already been defined in the scope */
  ALREADY_DEFINED_VARIBLE,

  /** The type from a let declaration does not match its expression */
  LET_TYPE_MISMATCH,

  /** The given module name for a type identifier is not a module */
  NOT_MODULE,

  /** A sub module is not exported by the parent module in a type identifier */
  NOT_EXPORTED,

  /** A function argument doesn't have a type annotation */
  TYPE_ANNOTATION_NEEDED,
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

export interface Error {
  message: ErrorMessage
  base: Base
}
