import { Base } from '../../ast/index'
import { isObjectLike } from '../../utils/type-guards'
import { ExpectEqualError, NType } from '../types/types'
import { BlockDisplay, InlineDisplay } from './ErrorDisplayer'

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

  /** Not all fields of record destructured */
  RECORD_DESTRUCTURE_INCOMPLETE,

  /** The number of items destructured from the tuple doesn't match its length */
  TUPLE_DESTRUCTURE_LENGTH_MISMATCH,
}

export type ErrorMessage =
  | {
      type: ErrorType.UNDEFINED_VARIABLE | ErrorType.UNDEFINED_TYPE
      name: string
    }
  | {
      type: ErrorType.NOT_MODULE
      modType: NType
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
      errors: ExpectEqualError[]
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
      errors: ExpectEqualError[]
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
      type: ErrorType.ENUM_DESTRUCTURE_NO_VARIANT
      enum: NType
      variant: string
    }
  | {
      type: ErrorType.ENUM_DESTRUCTURE_DEFINITE_MULT_VARIANTS
      enum: NType
      variant: string
      otherVariants: string[]
    }
  | {
      type: ErrorType.LIST_DESTRUCTURE_DEFINITE
      items: number
    }
  | {
      type: ErrorType.ENUM_DESTRUCTURE_FIELD_MISMATCH
      enum: NType
      variant: string
      fields: number
      given: number
    }
  | {
      type: ErrorType.TUPLE_DESTRUCTURE_LENGTH_MISMATCH
      tuple: NType
      fields: number
      given: number
    }
  | {
      type: ErrorType.RECORD_DESTRUCTURE_NO_KEY
      recordType: NType
      key: string
    }
  | {
      type: ErrorType.RECORD_DESTRUCTURE_INCOMPLETE
      recordType: NType
      keys: string[]
    }

export interface Error {
  message: ErrorMessage
  base: Base
}

// Maybe this shouldn't rely on `base`
export function displayErrorMessage (
  { message: err }: Error,
  display: (strings: TemplateStringsArray, ...items: InlineDisplay[]) => string,
): string | [string, ...(BlockDisplay | false)[]] {
  switch (err.type) {
    case ErrorType.ARG_TYPE_MISMATCH: {
      return display`The ${[err.argPos, 'th']} argument you give to a ${
        err.funcType
      } should be a ${err.expect}, but you gave a ${err.given}.`
    }
    case ErrorType.CALL_NON_FUNCTION: {
      return display`You call a ${err.funcType} like a function, but it's not a function.`
    }
    case ErrorType.DESTRUCTURE_TYPE_MISMATCH: {
      return err.destructure === 'enum'
        ? display`You destructure a ${err.assignedTo} with a pattern meant for enums, but it's not an enum.`
        : err.destructure === 'list'
        ? display`You destructure a ${err.assignedTo} with a pattern meant for lists, but it's not a list.`
        : err.destructure === 'record'
        ? display`You destructure a ${err.assignedTo} with a pattern meant for records, but it's not a record.`
        : display`You destructure a ${err.assignedTo} with a pattern meant for tuples, but it's not a tuple.`
    }
    case ErrorType.ENUM_DESTRUCTURE_DEFINITE_MULT_VARIANTS: {
      return display`Here, you expect that the ${err.enum} should be the ${
        err.variant
      } variant. However, it could also be ${[
        'or',
        err.otherVariants.map(variant => display`${variant}`),
      ]}, so I don't know what to do in those scenarios.`
    }
    case ErrorType.ENUM_DESTRUCTURE_FIELD_MISMATCH: {
      return [
        display`The ${err.variant} variant of a ${err.enum} has ${[
          'just one field',
          err.fields,
          'fields',
        ]}, but you gave ${['just one field', err.given, 'fields']}.`,
        err.given < err.fields &&
          display`If you don't need all the fields, you can use ${'_'} to discard the fields you don't need.`,
      ]
    }
    case ErrorType.ENUM_DESTRUCTURE_NO_VARIANT: {
      return display`${err.enum} doesn't have a variant ${err.variant}, so your pattern will never match.`
    }
    case ErrorType.LET_TYPE_MISMATCH: {
      return display`You assign what evaluates to a ${err.expression} to what should be a ${err.annotation}.`
    }
    case ErrorType.LIST_DESTRUCTURE_DEFINITE: {
      return display`Here, you expect that the list should have ${[
        'only one item',
        err.items,
        'items',
      ]}. However, the list might not have exactly ${[
        'one item',
        err.items,
        'items',
      ]}, so I don't know what to do in those scenarios.`
    }
    case ErrorType.NOT_EXPORTED: {
      return err.exported === 'module'
        ? display`This module doesn't export a submodule named ${err.name}.`
        : display`This module doesn't export a type named ${err.name}.`
    }
    case ErrorType.NOT_MODULE: {
      return display`${err.modType} isn't a module, so you can't get any exported types from it.`
    }
    case ErrorType.RECORD_DESTRUCTURE_INCOMPLETE: {
      return display`A ${err.recordType} has the keys ${[
        'and',
        err.keys.map(key => display`${key}`),
      ]}, but you didn't destructure them. If you don't need those fields, you should assign them to a ${'_'} to explicitly discard the values.`
    }
    case ErrorType.RECORD_DESTRUCTURE_NO_KEY: {
      return display`A ${err.recordType} doesn't have a field named ${err.key}.`
    }
    case ErrorType.TOO_MANY_ARGS: {
      return display`You gave too many arguments to a ${
        err.funcType
      }, which doesn't take a ${[err.argPos, 'th']} argument.`
    }
    case ErrorType.TUPLE_DESTRUCTURE_LENGTH_MISMATCH: {
      // Don't worry about the singular forms; tuples should have a minimum of
      // two fields.
      return display`A ${err.tuple} has ${[
        'one field',
        err.fields,
        'fields',
      ]}, but you gave ${['only one field', err.given, 'fields']}.`
    }
    case ErrorType.TYPE_ANNOTATION_NEEDED: {
      return display`Unfortunately, I can't figure out the type of this variable for you, so you have to specify its type here.`
    }
    case ErrorType.UNDEFINED_TYPE: {
      return display`I can't find a type named ${err.name} in this scope.`
    }
    case ErrorType.UNDEFINED_VARIABLE: {
      return display`I can't find a variable named ${err.name} in this scope.`
    }
    case ErrorType.UNRESOLVED_GENERIC: {
      return display`I can't figure out what the return type for ${err.funcType} should be. This probably is an issue with the function type, not your function call.`
    }
    default: {
      const errorMessage: unknown = err
      return display`Error ${String(
        isObjectLike(errorMessage) ? errorMessage.type : errorMessage,
      )}: Unfortunately, I don't have much information about this error.`
    }
  }
}
