import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Identifier } from './literals'
import { isType, Type } from './types'

export class Declaration extends Base {
  name: Identifier | null
  type: Type | null

  constructor (pos: BasePosition, [id, maybeType]: schem.infer<typeof Declaration.schema>) {
    super(pos, maybeType && maybeType[1] ? [maybeType[1]] : [])
    this.name = id
    this.type = maybeType && maybeType[1]
  }

  toString () {
    return this.type ? `${this.name}: ${this.type}` : this.name
  }

  static schema = schema.tuple([
    schema.instance(Identifier), // TODO: _, though this could be a pattern
    schema.nullable(schema.tuple([
      schema.any,
      schema.guard(isType),
    ])),
  ])
}

const typeVarsDeclarationSchema = schema.tuple([
  schema.any,
  schema.array(schema.tuple([
    schema.instance(Identifier),
    schema.any,
  ])),
  schema.instance(Identifier),
  schema.any,
])

export class Arguments extends Base {
  typeVars: string[]
  params: Declaration[]

  constructor (pos: BasePosition, [, maybeTypeVars, param, rawParams]: schem.infer<typeof Arguments.schema>) {
    super(pos)
    this.typeVars = maybeTypeVars ? [
      ...maybeTypeVars[0][1].map(([name]) => name.value),
      maybeTypeVars[0][2].value,
    ] : []
    this.params = [
      param,
      ...rawParams.map(([, param]) => param),
    ]
  }

  static schema = schema.tuple([
    schema.any, // [ _
    schema.nullable(schema.tuple([
      typeVarsDeclarationSchema,
      schema.any, // _
    ])),
    schema.instance(Declaration),
    schema.array(schema.tuple([
      schema.any, // __
      schema.instance(Declaration),
    ])),
    schema.any, // _ ]
  ])
}

export class TypeSpec extends Base {
  name: string
  typeVars: string[]

  constructor (pos: BasePosition, [name, maybeTypeVars]: schem.infer<typeof TypeSpec.schema>) {
    super(pos)
    this.name = name.value
    this.typeVars = maybeTypeVars ? [
      ...maybeTypeVars[1].map(([name]) => name.value),
      maybeTypeVars[2].value,
    ] : []
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(typeVarsDeclarationSchema),
  ])
}
