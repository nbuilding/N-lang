import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../ast'
import { Identifier } from './literals'

export type Type = Identifier | UnitType | TupleType | FuncType
export function isType (value: any): value is Type {
  return value instanceof Identifier || value instanceof UnitType
    || value instanceof TupleType || value instanceof FuncType
}

export class UnitType extends Base {
  static schema = schema.tuple([
    schema.any,
  ])

  static fromSchema (pos: BasePosition, _: schem.infer<typeof UnitType.schema>): UnitType {
    return new UnitType(pos)
  }
}
export class TupleType extends Base {
  types: Type[]

  constructor (pos: BasePosition, types: Type[]) {
    super(pos)
    this.types = types
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

  static schema = schema.tuple([
    schema.guard(isType),
    schema.any,
    schema.guard(isType),
  ])

  static fromSchema (pos: BasePosition, [takes, , returns]: schem.infer<typeof FuncType.schema>): FuncType {
    return new FuncType(pos, takes, returns)
  }
}
