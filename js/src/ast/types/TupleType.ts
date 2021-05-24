import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { GetTypeContext, GetTypeResult, isType, Type } from './Type'

export class TupleType extends Base implements Type {
  types: Type[]

  constructor (
    pos: BasePosition,
    [rawTypes, type]: schem.infer<typeof TupleType.schema>,
  ) {
    const types = [...rawTypes.map(([type]) => type), type]
    super(pos, types)
    this.types = types
  }

  getType (context: GetTypeContext): GetTypeResult {
    return {
      type: {
        type: 'tuple',
        types: this.types.map(type => context.scope.getTypeFrom(type).type),
      },
    }
  }

  toString (): string {
    return `(${this.types.join(', ')})`
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([schema.guard(isType), schema.any])),
    schema.guard(isType),
    schema.any,
  ])
}
