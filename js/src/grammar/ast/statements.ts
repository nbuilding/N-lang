import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Arguments, Declaration, TypeSpec } from './declaration'
import { Expression, FuncCall, isExpression, Return, UnaryOperation, UnaryOperator } from './expressions'
import { Identifier } from './literals'
import { isType, Type } from './types'

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

export type Statement = ImportStmt
  | LetStmt
  | VarStmt
  | EnumDeclaration
  | AliasDeclaration
  | ClassDeclaration
  | OldFor
  | For
  | UnaryOperation<UnaryOperator.AWAIT>
  | FuncCall
  | Return

function isStatement (value: any): value is Statement {
  return value instanceof ImportStmt ||
    value instanceof LetStmt ||
    value instanceof VarStmt ||
    value instanceof EnumDeclaration ||
    value instanceof AliasDeclaration ||
    value instanceof ClassDeclaration ||
    value instanceof OldFor ||
    value instanceof For ||
    value instanceof UnaryOperation && value.type === UnaryOperator.AWAIT ||
    value instanceof FuncCall ||
    value instanceof Return
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

const enumVariantSchema = schema.union([
  schema.tuple([
    schema.any,
    schema.instance(Identifier),
    schema.array(schema.tuple([
      schema.any,
      schema.guard(isType),
    ])),
    schema.any,
  ]),
  schema.tuple([
    schema.instance(Identifier),
  ]),
])

function parseVariant (variant: schem.infer<typeof enumVariantSchema>): [string, Type[]] {
  if (variant.length === 1) {
    return [variant[0].value, []]
  } else {
    return [
      variant[1].value,
      variant[2].map(([, type]) => type),
    ]
  }
}

export class EnumDeclaration extends Base {
  isPublic: boolean
  typeSpec: TypeSpec
  variants: [string, Type[]][]

  constructor (
    pos: BasePosition,
    [, pub, typeSpec, , [variant, variants]]: schem.infer<typeof EnumDeclaration.schema>,
  ) {
    super(pos)
    this.isPublic = pub !== null
    this.typeSpec = typeSpec
    this.variants = [
      parseVariant(variant),
      ...variants.map(([, variant]) => parseVariant(variant)),
    ]
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(TypeSpec),
    schema.any,
    schema.tuple([
      enumVariantSchema,
      schema.array(schema.tuple([
        schema.any,
        enumVariantSchema,
      ])),
    ]),
  ])
}

export class AliasDeclaration extends Base {
  isPublic: boolean
  typeSpec: TypeSpec
  type: Type

  constructor (
    pos: BasePosition,
    [, pub, typeSpec, , type]: schem.infer<typeof AliasDeclaration.schema>,
  ) {
    super(pos)
    this.isPublic = pub !== null
    this.typeSpec = typeSpec
    this.type = type
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(TypeSpec),
    schema.any,
    schema.guard(isType),
  ])
}

export class ClassDeclaration extends Base {
  isPublic: boolean
  name: string
  arguments: Arguments
  body: Block

  constructor (
    pos: BasePosition,
    [, pub, name, , args, , body]: schem.infer<typeof ClassDeclaration.schema>,
  ) {
    super(pos, [body])
    this.isPublic = pub !== null
    this.name = name.value
    this.arguments = args
    this.body = body
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(Identifier),
    schema.any,
    schema.instance(Arguments),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])
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

export class IfStmt extends Base {
  condition: Expression
  then: Block
  else: Block | Statement | null

  constructor (
    pos: BasePosition,
    [, condition, , ifThen, , ifElse]: schem.infer<typeof IfStmt.schema>,
  ) {
    super(pos, [condition, ifThen, ...(ifElse ? [ifElse[1]] : [])])
    this.condition = condition
    this.then = ifThen
    this.else = ifElse && ifElse[1]
  }

  toString () {
    return `if ${this.condition} ${this.then}`
      + (this.else ? ` else ${this.else}` : '')
  }

  static get schema () {
    return schema.tuple([
      schema.any,
      schema.guard(isExpression),
      schema.any,
      schema.instance(Block),
      schema.any,
      schema.nullable(schema.tuple([
        schema.any,
        schema.union([
          schema.instance(Block),
          schema.guard(isStatement),
        ]),
      ])),
    ])
  }
}
