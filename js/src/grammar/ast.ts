import moo from 'moo'
import { isEnum, isToken, shouldBe, shouldSatisfy } from '../utils/type-guards'

type NearleyArgs = (Base | moo.Token | NearleyArgs | null)[]
function shouldBeNearleyArgs (value: any): asserts value is NearleyArgs {
  shouldBe(Array, value)
  for (const val of value) {
    if (!(val === null || val instanceof Base || isToken(val))) {
      shouldBeNearleyArgs(val)
    }
  }
}

interface FromAnyable<T> {
  fromAny (pos: BasePosition, args: NearleyArgs): T
}

function getNonNullArgs (args: NearleyArgs): (Base | moo.Token)[] {
  const nonNullArgs: (Base | moo.Token)[] = []
  for (const arg of args) {
    // Assert that the type annotations are correct because Nearley kind of
    // fuzzles with TypeScript, and one can't be sure.
    if (arg) {
      if (Array.isArray(arg)) {
        nonNullArgs.push(...getNonNullArgs(arg))
      } else {
        nonNullArgs.push(arg)
      }
    }
  }
  return nonNullArgs
}

export function from<T> (fromAnyable: FromAnyable<T>) {
  function preprocessor (args: any[], _loc?: number, _reject?: {}): T {
    shouldBeNearleyArgs(args)
    const nonNullArgs = getNonNullArgs(args)
    if (nonNullArgs.length === 0) {
      throw new SyntaxError('I cannot create a Base out of nothing! (Array was empty or full of nulls.)')
    }
    const { line, col } = nonNullArgs[0]
    const lastTokenOrBase = nonNullArgs[nonNullArgs.length - 1]
    let endLine, endCol
    if (lastTokenOrBase instanceof Base) {
      endLine = lastTokenOrBase.endLine
      endCol = lastTokenOrBase.endCol
    } else {
      endLine = lastTokenOrBase.line + lastTokenOrBase.lineBreaks
      endCol = lastTokenOrBase.col + lastTokenOrBase.text.length // TODO: This doesn't deal with line breaks!
    }
    return fromAnyable.fromAny({ line, col, endLine, endCol }, args)
  }
  return preprocessor
}

interface BasePosition {
  line: number
  col: number
  endLine: number
  endCol: number
}

class Base {
  line: number
  col: number
  endLine: number
  endCol: number

  constructor ({ line, col, endLine, endCol }: BasePosition) {
    this.line = line
    this.col = col
    this.endLine = endLine
    this.endCol = endCol
  }

  static fromAny (pos: BasePosition, _: NearleyArgs): Base {
    return new Base(pos)
  }
}

export class Block extends Base {
  statements: Statement[]

  constructor (pos: BasePosition, statements: Statement[] = []) {
    super(pos)
    this.statements = statements
  }

  toString (topLevel = false) {
    if (topLevel) {
      return this.statements.join('\n')
    }
    // Add additional indentation after every newline
    return `{\n\t${this.statements.join('\n').replace(/\n/g, '\n\t')}\n}`
  }

  static fromAny (pos: BasePosition, [statements, statement]: NearleyArgs): Block {
    const stmts: Statement[] = []
    shouldBe(Array, statements)
    for (const statementSepPair of statements) {
      shouldBe(Array, statementSepPair)
      const [statement] = statementSepPair
      shouldSatisfy(isStatement, statement)
      stmts.push(statement)
    }
    shouldSatisfy(isStatement, statement)
    stmts.push(statement)
    return new Block(pos, stmts)
  }
}

export type Statement = ImportStmt | VarStmt | Expression

function isStatement (value: any): value is Statement {
  return value instanceof ImportStmt || value instanceof VarStmt ||
    isExpression(value)
}

export class ImportStmt extends Base {
  name: string

  constructor (pos: BasePosition, id: string) {
    super(pos)
    this.name = id
  }

  toString () {
    return `import ${this.name}`
  }

  static fromAny (pos: BasePosition, [, , id]: NearleyArgs): ImportStmt {
    shouldSatisfy(isToken, id)
    return new ImportStmt(pos, id.value)
  }
}

export class VarStmt extends Base {
  declaration: Declaration
  value: Expression

  constructor (pos: BasePosition, decl: Declaration, expr: Expression) {
    super(pos)
    this.declaration = decl
    this.value = expr
  }

  toString () {
    return `var ${this.declaration} = ${this.value}`
  }

  static fromAny (
    pos: BasePosition,
    [_var, _sp1, decl, _sp2, _eq, _sp3, expr]: NearleyArgs
  ): VarStmt {
    shouldBe(Declaration, decl)
    shouldSatisfy(isExpression, expr)
    return new VarStmt(pos, decl, expr)
  }
}

export class Function extends Base {
  params: Declaration[]
  returnType: Type
  body: Expression

  constructor (
    pos: BasePosition,
    params: Declaration[],
    returnType: Type,
    body: Expression,
  ) {
    super(pos)
    this.params = params
    this.returnType = returnType
    this.body = body
  }

  toString (): string {
    return `[${this.params.join(' ')}] -> ${this.returnType} ${this.body}`
  }

  static fromAny (
    pos: BasePosition,
    [
      _lbracket,
      _space,
      firstParam,
      otherParams,
      _space2,
      _rbracket,
      _space3,
      _arrow,
      _space4,
      returnType,
      _space5,
      expr,
    ]: NearleyArgs
  ): Function {
    shouldBe(Declaration, firstParam)
    const params: Declaration[] = [firstParam]
    shouldBe(Array, otherParams)
    for (const spaceParamPair of otherParams) {
      shouldBe(Array, spaceParamPair)
      const [, decl] = spaceParamPair
      shouldBe(Declaration, decl)
      params.push(decl)
    }
    shouldSatisfy(isType, returnType)
    shouldSatisfy(isExpression, expr)
    return new Function(pos, params, returnType, expr)
  }
}

export class For extends Base {
  value: Expression
  var: Declaration
  body: Expression

  constructor (
    pos: BasePosition,
    value: Expression,
    decl: Declaration,
    body: Expression,
  ) {
    super(pos)
    this.value = value
    this.var = decl
    this.body = body
  }

  toString (): string {
    return `for ${this.var} ${this.value} ${this.body}`
  }

  static fromAny (pos: BasePosition, [, , decl, , value, , expr]: NearleyArgs): For {
    shouldBe(Declaration, decl)
    shouldSatisfy(isExpression, expr)
    shouldSatisfy(isExpression, value)
    return new For(pos, value, decl, expr)
  }
}

export class Declaration extends Base {
  name: string
  type: Type | null

  constructor (pos: BasePosition, name: string, type: Type | null) {
    super(pos)
    this.name = name
    this.type = type
  }

  toString () {
    return this.type ? `${this.name}: ${this.type}` : this.name
  }

  static fromAny (pos: BasePosition, [id, maybeType]: NearleyArgs): Declaration {
    shouldSatisfy(isToken, id)
    let type = null
    if (Array.isArray(maybeType)) {
      type = maybeType[3]
      shouldSatisfy(isType, type)
    }
    return new Declaration(pos, id.value, type)
  }
}

type Type = Identifier
function isType (value: any): value is Type {
  return value instanceof Identifier
}

export type Expression = Literal | Operation | UnaryOperation | Comparisons
  | CallFunc | Print | Return | If | Identifier | Function | For | Block
function isExpression (value: any): value is Expression {
  return value instanceof Literal || value instanceof Operation ||
    value instanceof UnaryOperation || value instanceof Comparisons ||
    value instanceof CallFunc || value instanceof Print ||
    value instanceof Return || value instanceof If ||
    value instanceof Identifier || value instanceof Function ||
    value instanceof For || value instanceof Block
}

export abstract class Literal extends Base {
  abstract value: string
}

export class String extends Literal {
  value: string

  constructor (pos: BasePosition, string: string) {
    super(pos)
    this.value = string
  }

  toString () {
    return JSON.stringify(this.value)
  }

  static fromAny (pos: BasePosition, [str]: NearleyArgs): String {
    shouldSatisfy(isToken, str)
    return new String(pos, str.value)
  }
}

export class Number extends Literal {
  value: string

  constructor (pos: BasePosition, number: string) {
    super(pos)
    this.value = number
  }

  toString () {
    return this.value
  }

  static fromAny (pos: BasePosition, [num]: NearleyArgs): Number {
    shouldSatisfy(isToken, num)
    return new Number(pos, num.value)
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
    })
    this.type = type
    this.a = a
    this.b = b
  }
}

export class Comparisons extends Base {
  comparisons: Comparison[]

  constructor (pos: BasePosition, comparisons: Comparison[]) {
    super(pos)
    this.comparisons = comparisons
  }

  toString () {
    let str = `${this.comparisons[0].a}`
    for (const { type, b } of this.comparisons) {
      str += ` ${compareToString(type)} ${b}`
    }
    return `(${str})`
  }

  static fromAny (pos: BasePosition, [maybeComparisons, value]: NearleyArgs): Comparisons {
    const comparisons: Comparison[] = []
    let lastExpr
    shouldBe(Array, maybeComparisons)
    for (const comparisonOperatorPair of maybeComparisons) {
      shouldBe(Array, comparisonOperatorPair)
      const [left, , operator] = comparisonOperatorPair
      shouldSatisfy(isExpression, left)
      if (lastExpr) {
        shouldSatisfy(isEnum(Compare), lastExpr.operator)
        comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, left))
      }
      shouldSatisfy(isToken, operator)
      lastExpr = {
        left,
        operator: operator.value
      }
    }
    shouldSatisfy(isExpression, value)
    if (lastExpr) {
      shouldSatisfy(isEnum(Compare), lastExpr.operator)
      comparisons.push(new Comparison(lastExpr.operator, lastExpr.left, value))
    }
    if (comparisons.length === 0) {
      console.log(maybeComparisons)
      throw new TypeError('I should have at least one comparison!')
    }
    return new Comparisons(pos, comparisons)
  }
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
}

function operatorToString (self: Operator): string {
  switch (self) {
    case Operator.AND: return '&'
    case Operator.OR: return '|'
    case Operator.ADD: return '+'
    case Operator.MINUS: return '-'
    case Operator.MULTIPLY: return '*'
    case Operator.DIVIDE: return '/'
    case Operator.MODULO: return '%'
    case Operator.EXPONENT: return '^'
  }
}

export class Operation extends Base {
  type: Operator
  a: Expression
  b: Expression

  constructor (
    pos: BasePosition,
    operator: Operator,
    expr: Expression,
    val: Expression,
  ) {
    super(pos)
    this.type = operator
    this.a = expr
    this.b = val
  }

  toString () {
    return `(${this.a} ${operatorToString(this.type)} ${this.b})`
  }

  static operation (operator: Operator) {
    function fromAny (pos: BasePosition, [expr, , , , val]: NearleyArgs): Operation {
      shouldSatisfy(isExpression, expr)
      shouldSatisfy(isExpression, val)
      return new Operation(pos, operator, expr, val)
    }
    return from({ fromAny })
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

export class UnaryOperation extends Base {
  type: UnaryOperator
  value: Expression

  constructor (pos: BasePosition, operator: UnaryOperator, value: Expression) {
    super(pos)
    this.type = operator
    this.value = value
  }

  toString () {
    return `${unaryOperatorToString(this.type)}${this.value}`
  }

  static operation (operator: UnaryOperator) {
    function fromAny (pos: BasePosition, [, , value]: NearleyArgs): UnaryOperation {
      shouldSatisfy(isExpression, value)
      return new UnaryOperation(pos, operator, value)
    }
    return from({ fromAny })
  }
}

export class CallFunc extends Base {
  func: Expression
  params: Expression[]

  constructor (
    pos: BasePosition,
    value: Expression,
    params: Expression[],
  ) {
    super(pos)
    this.func = value
    this.params = params
  }

  toString () {
    return `<${this.func}${this.params.map(param => ' ' + param).join('')}>`
  }

  static fromAny (pos: BasePosition, [, , func, rawParams]: NearleyArgs): CallFunc {
    shouldSatisfy(isExpression, func)
    const params: Expression[] = []
    shouldBe(Array, rawParams)
    for (const spaceParamPair of rawParams) {
      shouldBe(Array, spaceParamPair)
      const [, param] = spaceParamPair
      shouldSatisfy(isExpression, param)
      params.push(param)
    }
    return new CallFunc(pos, func, params)
  }
}

export class Print extends Base {
  value: Expression

  constructor (pos: BasePosition, expr: Expression) {
    super(pos)
    this.value = expr
  }

  toString () {
    return `print ${this.value}`
  }

  static fromAny (pos: BasePosition, [, , expr]: NearleyArgs): Print {
    shouldSatisfy(isExpression, expr)
    return new Print(pos, expr)
  }
}

export class Return extends Base {
  value: Expression

  constructor (pos: BasePosition, expr: Expression) {
    super(pos)
    this.value = expr
  }

  toString () {
    return `return ${this.value}`
  }

  static fromAny (pos: BasePosition, [, , expr]: NearleyArgs): Return {
    shouldSatisfy(isExpression, expr)
    return new Return(pos, expr)
  }
}

export class If extends Base {
  condition: Expression
  then: Expression
  else?: Expression

  constructor (
    pos: BasePosition,
    condition: Expression,
    statement: Expression,
    maybeElse?: Expression
  ) {
    super(pos)
    this.condition = condition
    this.then = statement
    this.else = maybeElse
  }

  toString () {
    return `if ${this.condition} ${this.then}`
      + (this.else ? ` else ${this.else}` : '')
  }

  static fromAny (pos: BasePosition, [, , cond, , a, maybeB]: NearleyArgs): If {
    shouldSatisfy(isExpression, cond)
    shouldSatisfy(isExpression, a)
    let maybeElse
    if (Array.isArray(maybeB)) {
      const [, , , b] = maybeB
      shouldSatisfy(isExpression, b)
      maybeElse = b
    }
    return new If(pos, cond, a, maybeElse)
  }
}

export class Identifier extends Base {
  modules: string[]
  name: string

  constructor (pos: BasePosition, name: string, modules: string[] = []) {
    super(pos)
    this.name = name
    this.modules = modules
  }

  toString () {
    return this.modules.map(mod => mod + '.').join('') + this.name
  }

  static fromAny (pos: BasePosition, [modIdents, id]: NearleyArgs): Identifier {
    shouldSatisfy(isToken, id)
    shouldBe(Array, modIdents)
    const modules: string[] = []
    for (const spacePair of modIdents) {
      shouldBe(Array, spacePair)
      const [modIdent] = spacePair
      shouldSatisfy(isToken, modIdent)
      modules.push(modIdent.value)
    }
    return new Identifier(pos, id.value, modules)
  }
}
