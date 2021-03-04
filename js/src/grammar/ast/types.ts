import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Identifier } from './literals'

export type Type = ModuleId | UnitType | TupleType | FuncType
export function isType (value: any): value is Type {
  return value instanceof ModuleId || value instanceof UnitType
    || value instanceof TupleType || value instanceof FuncType
}

export class TupleType extends Base {
  types: Type[]

  constructor (pos: BasePosition, types: Type[]) {
    super(pos)
    this.types = types
  }

  toString () {
    return `(${this.types.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isType),
      schema.any,
      schema.any,
      schema.any,
    ])),
    schema.guard(isType),
    schema.any,
  ])

  static fromSchema (pos: BasePosition, [types, type]: schem.infer<typeof TupleType.schema>): TupleType {
    return new TupleType(pos, [
      ...types.map(([type]) => type),
      type,
    ])
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

  toString () {
    return `(${this.takes}) -> ${this.returns}`
  }

  static schema = schema.tuple([
    schema.guard(isType),
    schema.any,
    schema.guard(isType),
  ])

  static fromSchema (pos: BasePosition, [takes, , returns]: schem.infer<typeof FuncType.schema>): FuncType {
    return new FuncType(pos, takes, returns)
  }
}

export class ModuleId extends Base {
  modules: string[]
  name: string
  typeVars: Type[]

  constructor (pos: BasePosition, modules: string[], name: string, typeVars: Type[]) {
    super(pos)
    this.modules = modules
    this.name = name
    this.typeVars = typeVars
  }

  toString () {
    return this.modules.map(mod => mod + '.').join('') + this.name +
      (this.typeVars.length > 0 ? `[${this.typeVars.join(', ')}]` : '')
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.instance(Identifier),
      schema.any,
    ])),
    schema.instance(Identifier),
    schema.nullable(schema.tuple([
      schema.any,
      schema.array(schema.tuple([
        schema.guard(isType),
        schema.any,
      ])),
      schema.guard(isType),
      schema.any,
    ])),
  ])

  static fromSchema (pos: BasePosition, [modules, typeName, maybeTypeVars]: schem.infer<typeof ModuleId.schema>): ModuleId {
    return new ModuleId(
      pos,
      modules.map(([mod]) => mod.value),
      typeName.value,
      maybeTypeVars ? [
        ...maybeTypeVars[1].map(([type]) => type),
        maybeTypeVars[2]
      ] : [],
    )
  }
}

export class UnitType extends Base {
  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.any,
  ])

  static fromSchema (pos: BasePosition, _: schem.infer<typeof UnitType.schema>): UnitType {
    return new UnitType(pos)
  }
}
