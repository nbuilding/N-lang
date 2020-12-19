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
  value: Expression
  binding: Declaration
  body: Block

  constructor (value: Expression, decl: Declaration, body: Block) {
    super()
    this.value = value
    this.binding = decl
    this.body = body
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

export type Expression = Literal | Operator | CallFunc | Print | Return | If

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

export enum Compare {
  LESS = 'less',
  EQUAL = 'equal',
  GREATER = 'greater',
}

export class Comparison {
  type: Compare
  value: Expression
  with: Expression | Comparison

  constructor (type: Compare, value: Expression, expr: Expression | Comparison) {
    this.type = type
    this.value = value
    this.with = expr
  }
}

export enum Operator {
  AND = 'and',
  OR = 'or',
  ADD = 'add',
  MINUS = 'minus',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
}

export class Operation {
  type: Operator
  a: Expression
  b: Expression

  constructor (operator: Operator, expr: Expression, val: Expression) {
    this.type = operator
    this.a = expr
    this.b = val
  }
}

export enum UnaryOperator {
  NEGATE = 'negate',
  NOT = 'not',
}

export class UnaryOperation {
  type: UnaryOperator
  a: Expression

  constructor (operator: UnaryOperator, value: Expression) {
    this.type = operator
    this.a = value
  }
}

export class CallFunc {
  func: Expression
  params: Expression[]

  constructor (value: Expression, params: Expression[] = []) {
    this.func = value
    this.params = params
  }
}

export class Print {
  value: Expression

  constructor (expr: Expression) {
    this.value = expr
  }
}

export class Return {
  value: Expression

  constructor (expr: Expression) {
    this.value = expr
  }
}

export class If {
  condition: Expression
  then: Statement
  else?: Statement

  constructor (condition: Expression, statement: Statement, maybeElse?: Statement) {
    this.condition = condition
    this.then = statement
    this.else = maybeElse
  }
}

export class Identifier {
  modules: string[]
  name: string

  constructor (name: string, modules: string[] = []) {
    this.name = name
    this.modules = modules
  }

  identifier (name: string) {
    return new Identifier(name, [...this.modules, this.name])
  }
}
