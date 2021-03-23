import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { GetTypeContext, GetTypeResult, isType, Type } from './Type'

export class ModuleId extends Base implements Type {
  modules: Identifier[]
  name: Identifier
  typeVars: Type[]

  constructor (
    pos: BasePosition,
    [rawModules, typeName, maybeTypeVars]: schem.infer<typeof ModuleId.schema>,
  ) {
    const modules = rawModules.map(([mod]) => mod)
    const typeVars = maybeTypeVars
      ? [...maybeTypeVars[1][1].map(([type]) => type), maybeTypeVars[1][2]]
      : []
    super(pos, [...modules, typeName, ...typeVars])
    this.modules = modules
    this.name = typeName
    this.typeVars = typeVars
  }

  getType (context: GetTypeContext): GetTypeResult {
    throw new Error('Method not implemented.')
  }

  toString (): string {
    return (
      this.modules.map(mod => mod + '.').join('') +
      this.name +
      (this.typeVars.length > 0 ? `[${this.typeVars.join(', ')}]` : '')
    )
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([schema.instance(Identifier), schema.any])),
    schema.instance(Identifier),
    schema.nullable(
      schema.tuple([
        schema.any,
        schema.tuple([
          schema.any,
          schema.array(schema.tuple([schema.guard(isType), schema.any])),
          schema.guard(isType),
          schema.any,
        ]),
      ]),
    ),
  ])
}
