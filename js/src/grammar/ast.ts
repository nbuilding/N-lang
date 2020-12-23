export class Block {
  statements: Statement[]

  constructor (init: Statement[] = []) {
    this.statements = init
  }

  withStatement (statement: Statement) {
    return new Block([...this.statements, statement])
  }

  toString (topLevel = false) {
    if (topLevel) {
      return this.statements.join('\n')
    }
    // Add additional indentation after every newline
    return `{\n\t${this.statements.join('\n').replace(/\n/g, '\n\t')}\n}`
  }
}

export type Statement = ImportStmt | VarStmt | Expression

export class ImportStmt {
  name: string

  constructor (id: string) {
    this.name = id
  }

  toString () {
    return `import ${this.name}`
  }
}

export class VarStmt {
  declaration: Declaration
  value: Expression

  constructor (decl: Declaration, expr: Expression) {
    this.declaration = decl
    this.value = expr
  }

  toString () {
    return `var ${this.declaration} = ${this.value}`
  }
}

export class Function {
  params: Declaration[]
  returnType: Type
  body: Expression

  constructor (
    params: Declaration[],
    returnType: Type,
    body: Expression,
  ) {
    this.params = params
    this.returnType = returnType
    this.body = body
  }

  toString (): string {
    return `[${this.params.join(' ')}] -> ${this.returnType} ${this.body}`
  }
}

export class For {
  value: Expression
  var: Declaration
  body: Expression

  constructor (value: Expression, decl: Declaration, body: Expression) {
    this.value = value
    this.var = decl
    this.body = body
  }

  toString (): string {
    return `for ${this.var} ${this.value} ${this.body}`
  }
}

export class Declaration {
  name: string
  type: Type | null

  constructor (name: string, type: Type | null) {
    this.name = name
    this.type = type
  }

  toString () {
    return this.type ? `${this.name}: ${this.type}` : this.name
  }
}

type Type = Identifier

export type Expression = Literal | Operation | UnaryOperation | Comparisons
  | CallFunc | Print | Return | If | Identifier | Function | For | Block

export abstract class Literal {
  abstract value: string
}

export class String extends Literal {
  value: string

  constructor (string: string) {
    super()
    this.value = string
  }

  toString () {
    return JSON.stringify(this.value)
  }
}

export class Number extends Literal {
  value: string

  constructor (number: string) {
    super()
    this.value = number
  }

  toString () {
    return this.value
  }
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

interface Comparison {
  type: Compare
  a: Expression
  b: Expression
}

interface RawComparison {
  expr: Expression
  comparison: Compare
}

export class Comparisons {
  comparisons: Comparison[]

  constructor ([value, ...comparisons]: RawComparison[]) {
    this.comparisons = []
    let lastValue = value.expr
    for (const { expr, comparison } of comparisons) {
      this.comparisons.push({
        type: comparison,
        a: lastValue,
        b: expr
      })
      lastValue = expr
    }
  }

  toString () {
    let str = `${this.comparisons[0].a}`
    for (const { type, b } of this.comparisons) {
      str += ` ${compareToString(type)} ${b}`
    }
    return `(${str})`
  }
}

export enum Operator {
  AND = 'and',
  OR = 'or',
  ADD = 'add',
  MINUS = 'minus',
  MULTIPLY = 'multiply',
  DIVIDE = 'divide',
  INT_DIVIDE = 'int-divide',
  MODULO = 'modulo',
  EXPONENT = 'exponent',
}

function operatorToString (self: Operator): string {
  switch (self) {
    case Operator.AND: return '&'
    case Operator.OR: return '|'
    case Operator.ADD: return '+'
    case Operator.MINUS: return '-'
    case Operator.MULTIPLY: return '*'
    case Operator.DIVIDE: return '/'
    case Operator.INT_DIVIDE: return '//'
    case Operator.MODULO: return '%'
    case Operator.EXPONENT: return '^'
  }
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

  toString () {
    return `(${this.a} ${operatorToString(this.type)} ${this.b})`
  }
}

export enum UnaryOperator {
  NEGATE = 'negate',
  NOT = 'not',
}

function unaryOperatorToString (self: UnaryOperator): string {
  switch (self) {
    case UnaryOperator.NEGATE: return '-'
    case UnaryOperator.NOT: return 'not '
  }
}

export class UnaryOperation {
  type: UnaryOperator
  value: Expression

  constructor (operator: UnaryOperator, value: Expression) {
    this.type = operator
    this.value = value
  }

  toString () {
    return `${unaryOperatorToString(this.type)}${this.value}`
  }
}

export class CallFunc {
  func: Expression
  params: Expression[]

  constructor (value: Expression, params: Expression[] = []) {
    this.func = value
    this.params = params
  }

  toString () {
    return `<${this.func}${this.params.map(param => ' ' + param).join('')}>`
  }
}

export class Print {
  value: Expression

  constructor (expr: Expression) {
    this.value = expr
  }

  toString () {
    return `print ${this.value}`
  }
}

export class Return {
  value: Expression

  constructor (expr: Expression) {
    this.value = expr
  }

  toString () {
    return `return ${this.value}`
  }
}

export class If {
  condition: Expression
  then: Expression
  else?: Expression

  constructor (condition: Expression, statement: Expression, maybeElse?: Expression) {
    this.condition = condition
    this.then = statement
    this.else = maybeElse
  }

  toString () {
    return `if ${this.condition} ${this.then}`
      + (this.else ? ` else ${this.else}` : '')
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

  toString () {
    return this.modules.map(mod => mod + '.').join('') + this.name
  }
}
