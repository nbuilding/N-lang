import { Base, Operator, UnaryOperator } from '../../ast/index'
import { isObjectLike } from '../../utils/type-guards'
import { ComparisonResult } from '../types/comparisons'
import { NType } from '../types/types'
import { BlockDisplay, InlineDisplay } from './ErrorDisplayer'

export enum ErrorType {
  /** JavaScript runtime error */
  INTERNAL_ERROR = 'internal-error',

  // Conditions

  /** Condition: An if statement/expr condition was given a non-bool value */
  CONDITION_NOT_BOOL = 'condition-not-bool',

  // Declarations

  /** Declaration: The type from a let decl does not match its expression */
  LET_MISMATCH = 'let-mismatch',

  // Expressions

  /** Comparisons: Types in comparison don't match */
  COMPARISON_MISMATCH = 'comparison-mismatch',

  /** Comparisons: Types in comparison cannot be == or /='d */
  COMPARISON_CANNOT_EQUAL = 'comparison-cannot-equal',

  /** Comparisons: Types in comparison cannot be compared using > or < */
  COMPARISON_CANNOT_COMPARE = 'comparison-cannot-compare',

  /** FuncCall: Calling a non-function */
  CALL_NON_FUNCTION = 'call-non-function',

  /** FuncCall: Giving too many arguments to a function */
  TOO_MANY_ARGS = 'too-many-args',

  /** FuncCall: Function parameter type does not match */
  ARG_MISMATCH = 'arg-mismatch',

  /** IfExpression: Branch types don't match */
  IF_BRANCH_MISMATCH = 'if-branch-mismatch',

  /** List: List item types don't match */
  LIST_ITEMS_MISMATCH = 'list-items-mismatch',

  /** Operation: Operation cannot be performed between the two types */
  OPERATION_UNPERFORMABLE = 'operation-unperformable',

  /** Record: Duplicate key */
  RECORD_LITERAL_DUPE_KEY = 'record-literal-dupe-key',

  /** RecordAccess: Record doesn't have field */
  RECORD_NO_FIELD = 'record-no-field',

  /** RecordAccess: Accessing a field of a non-record */
  ACCESS_FIELD_OF_NON_RECORD = 'access-field-of-non-record',

  /** Return: Return type is not function return type */
  RETURN_MISMATCH = 'return-mismatch',

  /** Return: Can't return in non-function */
  RETURN_OUTSIDE_FUNCTION = 'return-outside-function',

  /** UnaryOperation: Operation can't be performed on type */
  UNARY_OPERATION_UNPERFORMABLE = 'unary-operation-unperformable',

  /** UnaryOperation: Cannot await outside non-cmd function */
  AWAIT_OUTSIDE_CMD = 'await-outside-cmd',

  // Literals

  /** Identifier: Variable is not defined in scope */
  UNDEFINED_VARIABLE = 'undefined-variable',

  /** Identifier: Variable with same name already defined in scope */
  DUPLICATE_VARIABLE = 'duplicate-variable',

  // Patterns

  /** Pattern can't destructure type */
  PATTERN_MISMATCH = 'pattern-mismatch',

  /** EnumPattern: Destructuring an enum with a nonexistent variant */
  ENUM_PATTERN_NO_VARIANT = 'enum-pattern-no-variant',

  /** EnumPattern: Destructuring an enum with multiple variants as definite */
  ENUM_PATTERN_DEF_MULT_VARIANTS = 'enum-pattern-def-mult-variants',

  /** EnumPattern: # of destructured fields =/= # of the variant fields */
  ENUM_PATTERN_FIELD_MISMATCH = 'enum-pattern-field-mismatch',

  /** ListPattern: Destructuring a list as a definite pattern */
  LIST_PATTERN_DEFINITE = 'list-pattern-definite',

  /** RecordPattern: Destructuring a nonexistent key from a record */
  RECORD_PATTERN_NO_KEY = 'record-pattern-no-key',

  /** RecordPattern: Not all fields of record destructured */
  RECORD_PATTERN_INCOMPLETE = 'record-pattern-incomplete',

  /** TuplePattern: The number of items destructured =/= tuple length */
  TUPLE_PATTERN_LENGTH_MISMATCH = 'tuple-pattern-length-mismatch',

  // Statements

  // TODO

  /** Type is not defined in scope */
  UNDEFINED_TYPE = 'undefined-type',

  /** The type from a var declaration does not match its expression */
  VAR_MISMATCH = 'var-mismatch',

  /** The given module name for a type identifier is not a module */
  NOT_MODULE = 'not-module',

  /** A sub module is not exported by the parent module in a type identifier */
  NOT_EXPORTED = 'not-exported',

  /** A function argument doesn't have a type annotation */
  TYPE_ANNOTATION_NEEDED = 'type-annotation-needed',

  /** Cannot resolve function type variable for last argument */
  UNRESOLVED_GENERIC = 'unresolved-generic',

  /** An `assert type` failed */
  TYPE_ASSERTION_FAIL = 'type-assertion-fail',

  /** An `assert value` was given a non-bool */
  VALUE_ASSERTION_NOT_BOOL = 'value-assertion-not-nool',
}

export type TypeErrorType =
  | ErrorType.CONDITION_NOT_BOOL
  | ErrorType.LET_MISMATCH
  | ErrorType.COMPARISON_MISMATCH
  | ErrorType.IF_BRANCH_MISMATCH
  | ErrorType.RETURN_MISMATCH
  | ErrorType.VAR_MISMATCH
  | ErrorType.TYPE_ASSERTION_FAIL
  | ErrorType.VALUE_ASSERTION_NOT_BOOL

export type ErrorMessage =
  | {
      type: ErrorType.INTERNAL_ERROR
      error: Error
    }
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
      type: TypeErrorType
      error: ComparisonResult
    }
  | {
      type: ErrorType.LIST_ITEMS_MISMATCH
      error: ComparisonResult
      index: number
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
      type: ErrorType.ARG_MISMATCH
      error: ComparisonResult
      argPos: number
    }
  | {
      type: ErrorType.UNRESOLVED_GENERIC
      funcType: NType
    }
  | {
      type: ErrorType.PATTERN_MISMATCH
      assignedTo: NType
      destructure: 'enum' | 'list' | 'tuple' | 'record'
    }
  | {
      type: ErrorType.ENUM_PATTERN_NO_VARIANT
      enum: NType
      variant: string
    }
  | {
      type: ErrorType.ENUM_PATTERN_DEF_MULT_VARIANTS
      enum: NType
      variant: string
      otherVariants: string[]
    }
  | {
      type: ErrorType.LIST_PATTERN_DEFINITE
      items: number
    }
  | {
      type: ErrorType.ENUM_PATTERN_FIELD_MISMATCH
      enum: NType
      variant: string
      fields: number
      given: number
    }
  | {
      type: ErrorType.TUPLE_PATTERN_LENGTH_MISMATCH
      tuple: NType
      fields: number
      given: number
    }
  | {
      type: ErrorType.RECORD_PATTERN_NO_KEY
      recordType: NType
      key: string
    }
  | {
      type: ErrorType.RECORD_PATTERN_INCOMPLETE
      recordType: NType
      keys: string[]
    }
  | {
      type: ErrorType.OPERATION_UNPERFORMABLE
      a: NType
      b: NType
      operation: Operator
    }
  | {
      type: ErrorType.UNARY_OPERATION_UNPERFORMABLE
      operand: NType
      operation: UnaryOperator
    }
  | {
      type: ErrorType.RECORD_LITERAL_DUPE_KEY
      key: string
    }
  | {
      // Too lazy to add things to these; can do later
      type:
        | ErrorType.RECORD_NO_FIELD
        | ErrorType.ACCESS_FIELD_OF_NON_RECORD
        | ErrorType.RETURN_OUTSIDE_FUNCTION
        | ErrorType.AWAIT_OUTSIDE_CMD
        | ErrorType.DUPLICATE_VARIABLE
    }

interface NError {
  message: ErrorMessage
  base: Base
}
export { NError as Error }

// Maybe this shouldn't rely on `base`
export function displayErrorMessage (
  { message: err }: NError,
  display: (strings: TemplateStringsArray, ...items: InlineDisplay[]) => string,
): string | [string, ...(BlockDisplay | false)[]] {
  switch (err.type) {
    case ErrorType.INTERNAL_ERROR: {
      return [
        'An internal error occurred.',
        err.error.stack || 'No stack trace available.',
        display`This is a bug with N. Please report this error on GitHub: ${[
          'https://github.com/nbuilding/N-lang/issues/new',
          'link',
        ]}`,
      ]
    }
    case ErrorType.ARG_MISMATCH: {
      return display`The ${[err.argPos, 'th']} argument you give to a TODO.`
    }
    case ErrorType.CALL_NON_FUNCTION: {
      return display`You call a ${err.funcType} like a function, but it's not a function.`
    }
    case ErrorType.PATTERN_MISMATCH: {
      return err.destructure === 'enum'
        ? display`You destructure a ${err.assignedTo} with a pattern meant for enums, but it's not an enum.`
        : err.destructure === 'list'
        ? display`You destructure a ${err.assignedTo} with a pattern meant for lists, but it's not a list.`
        : err.destructure === 'record'
        ? display`You destructure a ${err.assignedTo} with a pattern meant for records, but it's not a record.`
        : display`You destructure a ${err.assignedTo} with a pattern meant for tuples, but it's not a tuple.`
    }
    case ErrorType.ENUM_PATTERN_DEF_MULT_VARIANTS: {
      return display`Here, you expect that the ${err.enum} should be the ${
        err.variant
      } variant. However, it could also be ${[
        'or',
        err.otherVariants.map(variant => display`${variant}`),
      ]}, so I don't know what to do in those scenarios.`
    }
    case ErrorType.ENUM_PATTERN_FIELD_MISMATCH: {
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
    case ErrorType.ENUM_PATTERN_NO_VARIANT: {
      return display`${err.enum} doesn't have a variant ${err.variant}, so your pattern will never match.`
    }
    case ErrorType.LET_MISMATCH: {
      return display`You assign what evaluates to a TODO.`
    }
    case ErrorType.LIST_PATTERN_DEFINITE: {
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
    case ErrorType.RECORD_PATTERN_INCOMPLETE: {
      return display`A ${err.recordType} has the keys ${[
        'and',
        err.keys.map(key => display`${key}`),
      ]}, but you didn't destructure them. If you don't need those fields, you should assign them to a ${'_'} to explicitly discard the values.`
    }
    case ErrorType.RECORD_PATTERN_NO_KEY: {
      return display`A ${err.recordType} doesn't have a field named ${err.key}.`
    }
    case ErrorType.TOO_MANY_ARGS: {
      return display`You gave too many arguments to a ${
        err.funcType
      }, which doesn't take a ${[err.argPos, 'th']} argument.`
    }
    case ErrorType.TUPLE_PATTERN_LENGTH_MISMATCH: {
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
    case ErrorType.TYPE_ASSERTION_FAIL: {
      return display`Type assertion failed.`
    }
    case ErrorType.VALUE_ASSERTION_NOT_BOOL: {
      return display`You need to give a bool to a value assertion.`
    }
    default: {
      const errorMessage: unknown = err
      return display`Error ${String(
        isObjectLike(errorMessage) ? errorMessage.type : errorMessage,
      )}: Unfortunately, I don't have much information about this error.`
    }
  }
}
