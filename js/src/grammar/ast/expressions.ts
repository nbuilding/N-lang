import schema, * as schem from '../../utils/schema'
import { isEnum, isToken } from '../../utils/type-guards'
import { from } from '../from-nearley'
import { Base, BasePosition } from './base'
import { Arguments, Declaration } from './declaration'
import { Identifier, Literal, Unit, String } from './literals'
import { isPattern, Pattern } from './patterns'
import { Block } from './statements'
import { isType, Type } from './types'

export type Expression = Literal
  | Operation<Operator>
  | UnaryOperation<UnaryOperator>
  | Comparisons
  | FuncCall
  | Return
  | IfExpression
  | Identifier
  | Function
  | Tuple
  | Unit
  | RecordAccess
  | ImportFile
  | List
  | Record
export function isExpression (value: any): value is Expression {
  return value instanceof Literal ||
    value instanceof Operation ||
    value instanceof UnaryOperation ||
    value instanceof Comparisons ||
    value instanceof FuncCall ||
    value instanceof Return ||
    value instanceof IfExpression ||
    value instanceof Identifier ||
    value instanceof Function ||
    value instanceof Tuple ||
    value instanceof Unit ||
    value instanceof RecordAccess ||
    value instanceof ImportFile ||
    value instanceof List ||
    value instanceof Record
}

export class ImportFile extends Base {
  path: string
  oldSyntax: boolean

  constructor (pos: BasePosition, [, , path]: schem.infer<typeof ImportFile.schema>) {
    super(pos)
    this.path = path instanceof Identifier ? path.value + '.n' : path.value
    this.oldSyntax = path instanceof Identifier
  }

  toString () {
    return `imp ${this.path}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.guard((value: unknown): value is Identifier | String => {
      return value instanceof Identifier || value instanceof String
    }),
  ])
}

export class Return extends Base {
  value: Expression

  constructor (pos: BasePosition, [, , expr]: schem.infer<typeof Return.schema>) {
    super(pos, [expr])
    this.value = expr
  }

  toString () {
    return `return ${this.value}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.guard(isExpression),
  ])
}

export class Tuple extends Base {
  values: Expression[]

  constructor (pos: BasePosition, [values, value]: schem.infer<typeof Tuple.schema>) {
    super(pos)
    this.values = [
      ...values.map(([value]) => value),
      value,
    ]
  }

  toString () {
    return `(${this.values.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.any,
      schema.any,
    ])),
    schema.guard(isExpression),
    schema.any,
  ])
}

export type Condition = Expression
  | IfLet
export function isCondition (value: any): value is Condition {
  return value instanceof IfLet || isExpression(value)
}

export class IfLet extends Base {
  declaration: Declaration
  expression: Expression

  constructor (pos: BasePosition, [, declaration, , expression]: schem.infer<typeof IfLet.schema>) {
    super(pos, [expression])
    this.declaration = declaration
    this.expression = expression
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
  ])
}

export class IfExpression extends Base {
  condition: Condition
  then: Expression
  else: Expression

  constructor (
    pos: BasePosition,
    [, condition, , ifThen, , ifElse]: schem.infer<typeof IfExpression.schema>,
  ) {
    super(pos, [condition, ifThen, ifElse])
    this.condition = condition
    this.then = ifThen
    this.else = ifElse
  }

  toString () {
    return `if ${this.condition} ${this.then}`
      + (this.else ? ` else ${this.else}` : '')
  }

  static schema = schema.tuple([
    schema.any,
    schema.guard(isCondition),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.guard(isExpression),
  ])
}

export class Function extends Base {
  arguments: Arguments
  returnType: Type
  body: Block

  constructor (
    pos: BasePosition,
    [params, , returnType, , body]: schem.infer<typeof Function.schema>
  ) {
    super(pos, [params, returnType, body])
    this.arguments = params
    this.returnType = returnType
    this.body = body
  }

  toString (): string {
    return `${this.arguments} -> ${this.returnType} : ${this.body}`
  }

  static schema = schema.tuple([
    schema.instance(Arguments), // [ ... ]
    schema.any, // _ -> _
    schema.guard(isType),
    schema.any, // _ { _
    schema.instance(Block),
    schema.any, // _ }
  ])
}

export enum Compare {
  LESS = 'less',
  EQUAL = 'equal',
  GREATER = 'greater',
  LEQ = 'less-or-equal',
  NEQ = 'not-equal',
  GEQ = 'greater-or-equal',
}
function compareToString (self: Compare): string {
  switch (self) {
    case Compare.LESS: return '<'
    case Compare.EQUAL: return '='
    case Compare.GREATER: return '>'
    case Compare.LEQ: return '<='
    case Compare.NEQ: return '/='
    case Compare.GEQ: return '>='
  }
}

export class Comparison extends Base {
  type: Compare
  a: Expression
  b: Expression

  constructor (type: Compare, a: Expression, b: Expression) {
    super({
      line: a.line,
      col: a.col,
      endLine: b.endLine,
      endCol: b.endCol,
    }, [a, b])
    this.type = type
    this.a = a
    this.b = b
  }
}

export class Comparisons extends Base {
  comparisons: Comparison[]

  constructor (pos: BasePosition, [rawComparisons, value]: schem.infer<typeof Comparisons.schema>) {
    const comparisons: Comparison[] = []
    let lastExpr
    for (const comparisonOperatorPair of rawComparisons) {
      const [left, , operator] = comparisonOperatorPair
      if (lastExpr) {
        comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, left))
      }
      lastExpr = {
        left,
        operator: operator.value
      }
    }
    if (lastExpr) {
      comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, value))
    }
    if (comparisons.length === 0) {
      console.log(rawComparisons)
      throw new TypeError('I should have at least one comparison!')
    }
    super(pos, comparisons)
    this.comparisons = comparisons
  }

  toString () {
    let str = `${this.comparisons[0].a}`
    for (const { type, b } of this.comparisons) {
      str += ` ${compareToString(type)} ${b}`
    }
    return `(${str})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.guard((value: unknown): value is moo.Token & { value: Compare } => {
        return isToken(value) && isEnum(Compare)(value.value)
      }),
      schema.any,
    ])),
    schema.guard(isExpression),
  ])
}

export enum Operator {
  AND = 'and',
  OR = 'or',
  ADD = 'add',
  MINUS = 'minus',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
  MODULO = 'modulo',
  EXPONENT = 'exponent',
  PIPE = 'pipe',
}

export function operatorToString (self: Operator): string {
  switch (self) {
    case Operator.AND: return '&'
    case Operator.OR: return '|'
    case Operator.ADD: return '+'
    case Operator.MINUS: return '-'
    case Operator.MULTIPLY: return '*'
    case Operator.DIVIDE: return '/'
    case Operator.MODULO: return '%'
    case Operator.EXPONENT: return '^'
    case Operator.PIPE: return '|>'
  }
}

export class Operation<O extends Operator> extends Base {
  type: O
  a: Expression
  b: Expression

  constructor (
    pos: BasePosition,
    operator: O,
    expr: Expression,
    val: Expression,
  ) {
    super(pos, [expr, val])
    this.type = operator
    this.a = expr
    this.b = val
  }

  toString () {
    return `(${this.a} ${operatorToString(this.type)} ${this.b})`
  }

  static operation<O extends Operator> (operator: O) {
    const opSchema = schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.any,
      schema.any,
      schema.guard(isExpression),
    ])
    function fromSchema (pos: BasePosition, [expr, , , , val]: schem.infer<typeof opSchema>): Operation<O> {
      return new Operation(pos, operator, expr, val)
    }
    return from({ schema: opSchema, from: fromSchema })
  }
}

export enum UnaryOperator {
  NEGATE = 'negate',
  NOT = 'not',
  AWAIT = 'await',
}

export function unaryOperatorToString (self: UnaryOperator): string {
  switch (self) {
    case UnaryOperator.NEGATE: return 'negate'
    case UnaryOperator.NOT: return 'not'
    case UnaryOperator.AWAIT: return 'await'
  }
}

export class UnaryOperation<O extends UnaryOperator> extends Base {
  type: O
  value: Expression

  constructor (pos: BasePosition, operator: O, value: Expression) {
    super(pos, [value])
    this.type = operator
    this.value = value
  }

  toString () {
    return `${unaryOperatorToString(this.type)}${this.value}`
  }

  static prefix<O extends UnaryOperator> (operator: O) {
    const prefixSchema = schema.tuple([
      schema.any,
      schema.any,
      schema.guard(isExpression),
    ])
    function fromSchema (pos: BasePosition, [, , value]: schem.infer<typeof prefixSchema>): UnaryOperation<O> {
      return new UnaryOperation(pos, operator, value)
    }
    return from({ schema: prefixSchema, from: fromSchema })
  }

  static suffix<O extends UnaryOperator> (operator: O) {
    const suffixSchema = schema.tuple([
      schema.guard(isExpression),
      schema.any,
      schema.any,
    ])
    function fromSchema (pos: BasePosition, [value]: schem.infer<typeof suffixSchema>): UnaryOperation<O> {
      return new UnaryOperation(pos, operator, value)
    }
    return from({ schema: suffixSchema, from: fromSchema })
  }
}

export class RecordAccess extends Base {
  value: Expression
  field: string

  constructor (
    pos: BasePosition,
    [value, , field]: schem.infer<typeof RecordAccess.schema>,
  ) {
    super(pos, [value])
    this.value = value
    this.field = field.value
  }

  toString () {
    return `${this.value}.${this.field}`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
    schema.any,
    schema.instance(Identifier),
  ])
}

export class FuncCall extends Base {
  func: Expression
  params: Expression[]

  constructor (
    pos: BasePosition,
    [func, , maybeParams]: schem.infer<typeof FuncCall.schema>,
  ) {
    const params = maybeParams ? [
      ...maybeParams[0].map(([param]) => param),
      maybeParams[1],
    ] : []
    super(pos, [func, ...params])
    this.func = func
    this.params = params
  }

  toString () {
    return `${this.func}(${this.params.join(', ')})`
  }

  static schema = schema.tuple([
    schema.guard(isExpression),
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.guard(isExpression),
        schema.any,
      ])),
      schema.guard(isExpression),
      schema.any,
    ])),
    schema.any,
  ])
}

export class List extends Base {
  items: Expression[]

  constructor (
    pos: BasePosition,
    [, rawItems]: schem.infer<typeof List.schema>,
  ) {
    const items = rawItems ? [
      ...rawItems[0].map(([item]) => item),
      rawItems[1],
    ] : []
    super(pos, items)
    this.items = items
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.guard(isExpression),
        schema.any,
      ])),
      schema.guard(isExpression),
      schema.any,
    ])),
    schema.any,
  ])
}

export class RecordEntry extends Base {
  key: string
  value: Expression

  constructor (
    pos: BasePosition,
    [key, maybeValue]: schem.infer<typeof RecordEntry.schema>,
  ) {
    super(pos)
    this.key = key.value
    this.value = maybeValue ? maybeValue[1] : key
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.tuple([
      schema.any,
      schema.guard(isExpression),
    ])),
  ])
}

export class Record extends Base {
  entries: RecordEntry[]

  constructor (
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof Record.schema>,
  ) {
    const entries = rawEntries ? [
      ...rawEntries[0].map(([entry]) => entry),
      rawEntries[1],
    ] : []
    super(pos, entries)
    this.entries = entries
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.instance(RecordEntry),
        schema.any,
      ])),
      schema.instance(RecordEntry),
      schema.any,
    ])),
    schema.any,
  ])
}
