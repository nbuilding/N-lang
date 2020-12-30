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

interface FromAnyable<T extends Base> {
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

export function from<T extends Base> (fromAnyable: FromAnyable<T>) {
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
      const lastLine = lastTokenOrBase.text.includes('\n')
        ? lastTokenOrBase.text.slice(lastTokenOrBase.text.lastIndexOf('\n') + 1)
        : lastTokenOrBase.text
      endCol = lastTokenOrBase.col + lastLine.length
    }
    return fromAnyable.fromAny({ line, col, endLine, endCol }, args)
  }
  return preprocessor
}

export const includeBrackets = from({
  fromAny ({ line, col, endLine, endCol }: BasePosition, [, , base]: NearleyArgs): Base {
    shouldBe(Base, base)
    base.line = line
    base.col = col
    base.endLine = endLine
    base.endCol = endCol
    return base
  }
})

interface BasePosition {
  line: number
  col: number
  endLine: number
  endCol: number
}
function posHas (
  { line: startLine, col: startCol, endLine, endCol }: BasePosition,
  line: number,
  col: number,
): boolean {
  if (line > startLine && line < endLine) {
    return true
  } else if (line === startLine) {
    if (col < startCol) return false
    return line === endLine ? col <= endCol : true
  } else if (line === endLine) {
    return col <= endCol
  } else {
    return false
  }
}

export class Base {
  line: number
  col: number
  endLine: number
  endCol: number
  children: Base[]

  constructor ({ line, col, endLine, endCol }: BasePosition, children: Base[] = []) {
    this.line = line
    this.col = col
    this.endLine = endLine
    this.endCol = endCol
    this.children = children
  }

  find (line: number, col: number): Base[] {
    if (posHas(this, line, col)) {
      const bases: Base[] = []
      for (const base of this.children) {
        if (posHas(base, line, col)) {
          bases.push(...base.find(line, col))
        }
      }
      bases.push(this)
      return bases
    } else {
      return []
    }
  }

  static fromAny (pos: BasePosition, _: NearleyArgs): Base {
    return new Base(pos)
  }
}

export class Block extends Base {
  statements: Statement[]

  constructor (pos: BasePosition, statements: Statement[] = []) {
    super(pos, statements)
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
    super(pos, [decl, expr])
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
    super(pos, [...params, returnType, body])
    this.params = params
    this.returnType = returnType
    this.body = body
  }

  toString (): string {
    return `[${this.params.join(' ')}] -> ${this.returnType} : ${this.body}`
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
      exprWrapper,
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
    shouldBe(Array, exprWrapper)
    const [, , expr] = exprWrapper
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
    super(pos, [value, decl, body])
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
    super(pos, type ? [type] : [])
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

export type Type = Identifier | UnitType | TupleType | FuncType
export function isType (value: any): value is Type {
  return value instanceof Identifier || value instanceof UnitType
    || value instanceof TupleType || value instanceof FuncType
}

export class UnitType extends Base {
  static fromAny (pos: BasePosition, _: NearleyArgs): UnitType {
    return new UnitType(pos)
  }
}

export class TupleType extends Base {
  types: Type[]

  constructor (pos: BasePosition, types: Type[]) {
    super(pos)
    this.types = types
  }

  static fromAny (pos: BasePosition, [maybeTypes, type]: NearleyArgs): TupleType {
    const types: Type[] = []
    shouldBe(Array, maybeTypes)
    for (const typeArr of maybeTypes) {
      shouldBe(Array, typeArr)
      const [type] = typeArr
      shouldSatisfy(isType, type)
      types.push(type)
    }
    shouldSatisfy(isType, type)
    types.push(type)
    return new TupleType(pos, types)
  }
}

export class FuncType extends Base {
  takes: Type
  returns: Type

  constructor (pos: BasePosition, takes: Type, returns: Type) {
    super(pos)
    this.takes = takes
    this.returns = returns
  }

  static fromAny (pos: BasePosition, [takes, , , , returns]: NearleyArgs): FuncType {
    shouldSatisfy(isType, takes)
    shouldSatisfy(isType, returns)
    return new FuncType(pos, takes, returns)
  }
}

export type Expression = Literal | Operation | UnaryOperation | Comparisons
  | CallFunc | Print | Return | If | Identifier | Function | For | Block | Tuple
export function isExpression (value: any): value is Expression {
  return value instanceof Literal || value instanceof Operation ||
    value instanceof UnaryOperation || value instanceof Comparisons ||
    value instanceof CallFunc || value instanceof Print ||
    value instanceof Return || value instanceof If ||
    value instanceof Identifier || value instanceof Function ||
    value instanceof For || value instanceof Block || value instanceof Tuple
}

export class Literal extends Base {
  value: string

  constructor (pos: BasePosition, value: string) {
    super(pos)
    this.value = value
  }

  toString () {
    return this.value
  }

  static fromAny<T extends typeof Literal> (pos: BasePosition, [str]: NearleyArgs): InstanceType<T> {
    shouldSatisfy(isToken, str)
    return new this(pos, str.value) as InstanceType<T>
  }
}

export class String extends Literal {
  toString () {
    return JSON.stringify(this.value)
  }
}

export class Char extends Literal {
  toString () {
    return `\\{${this.value}}`
  }
}

// A number can represent either an int or a float
export class Number extends Literal {}

export class Float extends Literal {}

export class Unit extends Literal {}

export class Tuple extends Base {
  values: Expression[]

  constructor (pos: BasePosition, values: Expression[]) {
    super(pos)
    this.values = values
  }

  toString () {
    return `(${this.values.join(', ')})`
  }

  static fromAny (pos: BasePosition, [maybeValues, value]: NearleyArgs): Tuple {
    const values: Expression[] = []
    shouldBe(Array, maybeValues)
    for (const valueArr of maybeValues) {
      shouldBe(Array, valueArr)
      const [value] = valueArr
      shouldSatisfy(isExpression, value)
      values.push(value)
    }
    shouldSatisfy(isExpression, value)
    values.push(value)
    return new Tuple(pos, values)
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
    }, [a, b])
    this.type = type
    this.a = a
    this.b = b
  }
}

export class Comparisons extends Base {
  comparisons: Comparison[]

  constructor (pos: BasePosition, comparisons: Comparison[]) {
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
    super(pos, [expr, val])
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

export function unaryOperatorToString (self: UnaryOperator): string {
  switch (self) {
    case UnaryOperator.NEGATE: return '-'
    case UnaryOperator.NOT: return 'not '
  }
}

export class UnaryOperation extends Base {
  type: UnaryOperator
  value: Expression

  constructor (pos: BasePosition, operator: UnaryOperator, value: Expression) {
    super(pos, [value])
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
    super(pos, [value, ...params])
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
    super(pos, [expr])
    this.value = expr
  }

  toString () {
    return `print ${this.value}`
  }

  static fromAny (pos: BasePosition, [, maybeExpr1, maybeExpr2]: NearleyArgs): Print {
    const expr = maybeExpr1 || maybeExpr2
    shouldSatisfy(isExpression, expr)
    return new Print(pos, expr)
  }
}

export class Return extends Base {
  value: Expression

  constructor (pos: BasePosition, expr: Expression) {
    super(pos, [expr])
    this.value = expr
  }

  toString () {
    return `return ${this.value}`
  }

  static fromAny (pos: BasePosition, [, maybeExpr1, maybeExpr2]: NearleyArgs): Return {
    const expr = maybeExpr1 || maybeExpr2
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
    super(pos, [condition, statement, ...(maybeElse ? [maybeElse] : [])])
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
