import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from './base'
import { Identifier } from './literals'

export type Type = ModuleId
  | UnitType
  | TupleType
  | FuncType
  | RecordType
export function isType (value: any): value is Type {
  return value instanceof ModuleId
    || value instanceof UnitType
    || value instanceof TupleType
    || value instanceof FuncType
    || value instanceof RecordType
}

export class TupleType extends Base {
  types: Type[]

  constructor (pos: BasePosition, [types, type]: schem.infer<typeof TupleType.schema>) {
    super(pos)
    this.types = [
      ...types.map(([type]) => type),
      type,
    ]
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
}

export class FuncType extends Base {
  takes: Type
  returns: Type

  constructor (pos: BasePosition, [takes, , returns]: schem.infer<typeof FuncType.schema>) {
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
}

export class ModuleId extends Base {
  modules: string[]
  name: string
  typeVars: Type[]

  constructor (pos: BasePosition, [modules, typeName, maybeTypeVars]: schem.infer<typeof ModuleId.schema>) {
    super(pos)
    this.modules = modules.map(([mod]) => mod.value)
    this.name = typeName.value
    this.typeVars = maybeTypeVars ? [
      ...maybeTypeVars[1].map(([type]) => type),
      maybeTypeVars[2]
    ] : []
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
}

export class UnitType extends Base {
  constructor (pos: BasePosition, _: schem.infer<typeof UnitType.schema>) {
    super(pos)
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.any,
  ])
}

export class RecordType extends Base {
  entries: [string, Type][]

  constructor (
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof RecordType.schema>,
  ) {
    const entries: [string, Type][] = rawEntries.map(([key, , type]) => [
      key.value,
      type,
    ])
    super(pos, entries.map(([, value]) => value))
    this.entries = entries
  }

  static schema = schema.tuple([
    schema.any,
    schema.array(schema.tuple([
      schema.instance(Identifier),
      schema.any,
      schema.guard(isType),
      schema.any,
    ])),
    schema.any,
  ])
}
