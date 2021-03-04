import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Declaration } from './declaration'
import { Expression, isExpression } from './expressions'
import { Identifier } from './literals'

export class Block extends Base {
  statements: Statement[]

  constructor (pos: BasePosition, rawStatements?: schem.infer<typeof Block.schema>) {
    const statements = rawStatements ? [
      ...rawStatements[0].map(([statement]) => statement),
      rawStatements[1],
    ] : []
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

  constructor (pos: BasePosition, [, , id]: schem.infer<typeof ImportStmt.schema>) {
    super(pos)
    this.name = id.value
  }

  toString () {
    return `import ${this.name}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.instance(Identifier),
  ])
}

export class LetStmt extends Base {
  declaration: Declaration
  public: boolean
  value: Expression

  constructor (pos: BasePosition, [, pub, decl, , expr]: schem.infer<typeof LetStmt.schema>) {
    super(pos, [decl, expr])
    this.declaration = decl
    this.public = pub !== null
    this.value = expr
  }

  toString () {
    return `let ${this.declaration} = ${this.value}`
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.nullable(schema.tuple([schema.any, schema.any])),
      schema.instance(Declaration),
      schema.any,
      schema.guard(isExpression),
    ])
  }
}

export class VarStmt extends Base {
  declaration: Declaration
  value: Expression

  constructor (pos: BasePosition, [, decl, , expr]: schem.infer<typeof VarStmt.schema>) {
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
}

export class OldFor extends Base {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: schem.infer<typeof OldFor.schema>,
  ) {
    super(pos, [value, decl, block])
    this.value = value
    this.var = decl
    this.body = block
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
}

export class For extends Base {
  value: Expression
  var: Declaration
  body: Block

  constructor (
    pos: BasePosition,
    [, decl, , value, , block]: schem.infer<typeof For.schema>,
  ) {
    super(pos, [value, decl, block])
    this.value = value
    this.var = decl
    this.body = block
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
}
