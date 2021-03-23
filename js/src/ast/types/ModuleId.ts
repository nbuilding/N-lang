import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { GetTypeContext, GetTypeResult, isType, Type } from './Type'

export class ModuleId extends Base implements Type {
  modules: string[]
  name: string
  typeVars: Type[]

  constructor (pos: BasePosition, [modules, typeName, maybeTypeVars]: schem.infer<typeof ModuleId.schema>) {
    super(pos)
    this.modules = modules.map(([mod]) => mod.value)
    this.name = typeName.value
    this.typeVars = maybeTypeVars ? [
      ...maybeTypeVars[1][1].map(([type]) => type),
      maybeTypeVars[1][2],
    ] : []
  }

  getType (context: GetTypeContext): GetTypeResult {
    throw new Error('Method not implemented.')
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
      schema.tuple([
        schema.any,
        schema.array(schema.tuple([
          schema.guard(isType),
          schema.any,
        ])),
        schema.guard(isType),
        schema.any,
      ]),
    ])),
  ])
}
