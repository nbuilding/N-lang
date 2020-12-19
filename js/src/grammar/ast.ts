export class Block {
  statements: Statement[]

  constructor (init: Statement[] = []) {
    this.statements = init
  }

  withStatement (statement: Statement) {
    return new Block([...this.statements, statement])
  }
}

abstract class Statement {}

export class ImportStmt extends Statement {
  name: string

  constructor (id: string) {
    super()
    this.name = id
  }
}

export class PrintStmt extends Statement {
  value: Expression

  constructor (expr: Expression) {
    super()
    this.value = expr
  }
}

export class ReturnStmt extends Statement {
  value: Expression

  constructor (expr: Expression) {
    super()
    this.value = expr
  }
}

export class VarStmt extends Statement {
  declare: Declaration
  value: Expression

  constructor (decl: Declaration, expr: Expression) {
    super()
    this.declare = decl
    this.value = expr
  }
}

export class FuncDeclaration extends Statement {
  name: string
  params: Declaration[]
  returnType: Type
  body: Block
  returnExpr: Expression

  constructor ({ name, params } : { name: string, params: Declaration[] }, returnType: Type, body: Block, returnExpr: Expression) {
    super()
    this.name = name
    this.params = params
    this.returnType = returnType
    this.body = body
    this.returnExpr = returnExpr
  }
}

export class LoopStmt extends Statement {
  value: Value
  binding: Declaration
  body: Block

  constructor (value: Value, decl: Declaration, body: Block) {
    super()
    this.value = value
    this.binding = decl
    this.body = body
  }
}

export class IfStmt extends Statement {
  condition: Expression
  then: Statement
  else?: Statement

  constructor (condition: Expression, statement: Statement, maybeElse?: Statement) {
    super()
    this.condition = condition
    this.then = statement
    this.else = maybeElse
  }
}

export class Declaration {
  name: string
  type: Type

  constructor (name: string, type: Type) {
    this.name = name
    this.type = type
  }
}

type Type = string

export abstract class Expression {}

export type Value = Literal | Expression | CallFunc

abstract class Literal {
  abstract value: string
}

export class String extends Literal {
  value: string

  constructor (string: string) {
    super()
    this.value = string
  }
}

export class Number extends Literal {
  value: string

  constructor (number: string) {
    super()
    this.value = number
  }
}

export enum OperatorType {
  AND = 'and',
  OR = 'or',
  GREATER_THAN = 'greater-than',
  LESS_THAN = 'less-than',
  ADD = 'add',
  MINUS = 'minus',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
}

export class Operator {
  type: OperatorType
  a: Expression
  b: Value

  constructor (operatorName: OperatorType, expr: Expression, val: Value) {
    this.type = operatorName
    this.a = expr
    this.b = val
  }
}

export enum UnaryOperatorType {
  NEGATE = 'negate',
  NOT = 'not',
}

export class UnaryOperator {
  type: UnaryOperatorType
  a: Value

  constructor (operatorName: UnaryOperatorType, value: Value) {
    this.type = operatorName
    this.a = value
  }
}

export class CallFunc {
  func: Value
  params: Value[]

  constructor (value: Value, params: Value[] = []) {
    this.func = value
    this.params = params
  }
}
