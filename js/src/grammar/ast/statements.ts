import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Declaration } from './declaration'
import { Expression, isExpression } from './expressions'
import { Identifier } from './literals'

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

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.instance(Identifier),
  ])

  static fromSchema (pos: BasePosition, [, , id]: schem.infer<typeof ImportStmt.schema>): ImportStmt {
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

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
  ])

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

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])

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

  static schema = schema.tuple([
    schema.any,
    schema.instance(Declaration),
    schema.any,
    schema.guard(isExpression),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])

  static fromSchema (pos: BasePosition, [, decl, , value, , block]: schem.infer<typeof For.schema>): For {
    return new For(pos, value, decl, block)
  }
}
