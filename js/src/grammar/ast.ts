export class Block {
  statements: Statement[]

  constructor (init: Statement[] = []) {
    this.statements = init
  }

  withStatement (statement: Statement) {
    return new Block([...this.statements, statement])
  }

  toString (indent: number = 0) {
    const indentation = '\t'.repeat(indent)
    // Add additional indentation after every newline
    return indentation +
      this.statements.join('\n').replace(/\n/g, '\n' + indentation)
  }
}

export type Statement = ImportStmt | VarStmt | FuncDeclaration | LoopStmt
  | Expression

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
    return `var ${this.declaration} < ${this.value}`
  }
}

export class FuncDeclaration {
  name: string
  params: Declaration[]
  returnType?: Type
  body: Block
  returnExpr?: Expression

  constructor (
    { name, params } : { name: string, params: Declaration[] },
    returnType: Type | undefined,
    body: Block,
    returnExpr?: Expression
  ) {
    this.name = name
    this.params = params
    this.returnType = returnType
    this.body = body
    this.returnExpr = returnExpr
  }

  toString () {
    return `> ${this.name}` + this.params.map(param => ' ' + param).join('')
      + (this.returnType ? ` -> ${this.returnType}` : '')
      + ` |\n${this.body.toString(1)}\n<`
  }
}

export class LoopStmt {
  value: Expression
  var: Declaration
  body: Block

  constructor (value: Expression, decl: Declaration, body: Block) {
    this.value = value
    this.var = decl
    this.body = body
  }

  toString () {
    return `> loop ${this.value} ${this.var} |\n${this.body.toString(1)}\n<`
  }
}

export class Declaration {
  name: string
  type: Type

  constructor (name: string, type: Type) {
    this.name = name
    this.type = type
  }

  toString () {
    return `${this.name}: ${this.type}`
  }
}

type Type = Identifier

export type Expression = Literal | Operation | UnaryOperation | Comparisons
  | CallFunc | Print | Return | If | Identifier

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
}

function compareToString (self: Compare): string {
  switch (self) {
    case Compare.LESS: return '<'
    case Compare.EQUAL: return '='
    case Compare.GREATER: return '>'
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
}

function operatorToString (self: Operator): string {
  switch (self) {
    case Operator.AND: return '&'
    case Operator.OR: return '|'
    case Operator.ADD: return '+'
    case Operator.MINUS: return '-'
    case Operator.MULTIPLY: return '*'
    case Operator.DIVIDE: return '/'
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
    case UnaryOperator.NOT: return '~'
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
    return `{${this.func}${this.params.map(param => ' ' + param).join('')}}`
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
    return `if ${this.condition} then ${this.then}`
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
