import schema, * as schem from '../../utils/schema'
import { isToken } from '../../utils/type-guards'
import { Base, BasePosition } from './base'
import { Declaration } from './declaration'
import { Expression, isExpression } from './expressions'
import { Identifier } from './literals'

export class Modifiers extends Base {
  public: boolean

  constructor (pos: BasePosition, isPublic: boolean) {
    super(pos)
    this.public = isPublic
  }

  static schema = schema.tuple([
    schema.nullable(schema.guard(isToken)),
  ])

  static fromSchema (pos: BasePosition, [pub]: schem.infer<typeof Modifiers.schema>): Modifiers {
    return new Modifiers(pos, pub !== null)
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

  static schema = schema.tuple([
    schema.array(
      schema.tuple([
        schema.guard(isStatement),
        schema.any,
      ]),
    ),
    schema.guard(isStatement),
  ])

  static fromSchema (pos: BasePosition, [statements, statement]: schem.infer<typeof Block.schema>): Block {
    return new Block(pos, [
      ...statements.map(([statement]) => statement),
      statement,
    ])
  }

  static empty (): Block {
    return new Block({
      // Dummy values
      line: 0,
      col: 0,
      endLine: 0,
      endCol: 0,
    })
  }
}

export type Statement = ImportStmt | LetStmt | VarStmt | Expression

function isStatement (value: any): value is Statement {
  return value instanceof ImportStmt ||
    value instanceof LetStmt ||
    value instanceof VarStmt ||
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

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.instance(Identifier),
  ])

  static fromSchema (pos: BasePosition, [, , id]: schem.infer<typeof ImportStmt.schema>): ImportStmt {
    return new ImportStmt(pos, id.value)
  }
}

export class LetStmt extends Base {
  declaration: Declaration
  modifiers: Modifiers
  value: Expression

  constructor (pos: BasePosition, decl: Declaration, modifiers: Modifiers, expr: Expression) {
    super(pos, [decl, expr])
    this.declaration = decl
    this.modifiers = modifiers
    this.value = expr
  }

  toString () {
    return `let ${this.declaration} = ${this.value}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.instance(Modifiers),
      schema.any,
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
    ])
  }

  static fromSchema (
    pos: BasePosition,
    [, modifiers, , decl, , expr]: schem.infer<typeof LetStmt.schema>
  ): LetStmt {
    return new LetStmt(pos, decl, modifiers, expr)
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

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
    ])
  }

  static fromSchema (
    pos: BasePosition,
    [, decl, , expr]: schem.infer<typeof VarStmt.schema>
  ): VarStmt {
    return new VarStmt(pos, decl, expr)
  }
}

export class OldFor extends Base {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    value: Expression,
    decl: Declaration,
    body: Block,
  ) {
    super(pos, [value, decl, body])
    this.value = value
    this.var = decl
    this.body = body
  }

  toString (): string {
    return `for ${this.var} ${this.value} ${this.body}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
      schema.any,
      schema.instance(Block),
      schema.any,
    ])
  }

  static fromSchema (pos: BasePosition, [, decl, , value, , block]: schem.infer<typeof OldFor.schema>): OldFor {
    return new OldFor(pos, value, decl, block)
  }
}

export class For extends Base {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    value: Expression,
    decl: Declaration,
    body: Block,
  ) {
    super(pos, [value, decl, body])
    this.value = value
    this.var = decl
    this.body = body
  }

  toString (): string {
    return `for ${this.var} ${this.value} ${this.body}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
      schema.any,
      schema.instance(Block),
      schema.any,
    ])
  }

  static fromSchema (pos: BasePosition, [, decl, , value, , block]: schem.infer<typeof For.schema>): For {
    return new For(pos, value, decl, block)
  }
}
