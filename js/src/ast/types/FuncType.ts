import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { TypeVars } from '../declaration/TypeVars'
import { isType, Type } from './Type'

export class FuncType extends Base implements Type {
  takes: Type
  returns: Type
  typeVars: TypeVars | null

  constructor (pos: BasePosition, [maybeTypeVars, takes, , returns]: schem.infer<typeof FuncType.schema>) {
    super(pos)
    this.takes = takes
    this.returns = returns
    this.typeVars = maybeTypeVars && maybeTypeVars[0]
  }

  toString () {
    return `(${this.typeVars ? this.typeVars + ' ' : ''}${this.takes} -> ${this.returns})`
  }

  static get schema () {
    return schema.tuple([
      schema.nullable(schema.tuple([
        schema.instance(TypeVars),
        schema.any,
      ])),
      schema.guard(isType),
      schema.any,
      schema.guard(isType),
    ])
  }
}
