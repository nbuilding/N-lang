import { Base } from '../../ast/index'

export enum ErrorType {
  /** Variable is not defined in scope */
  UNDEFINED_VARIABLE,

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

  /** A variable or import was never used */
  UNUSED_VARIABLE,

  /** A type was never used */
  UNUSED_TYPE,
}

export type ErrorNoBase = {
  type: ErrorType
}

export interface Error extends ErrorNoBase {
  base: Base
}
