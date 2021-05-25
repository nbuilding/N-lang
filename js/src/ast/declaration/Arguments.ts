import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from './Declaration'
import { TypeVars } from './TypeVars'

export class Arguments extends Base {
  typeVars: TypeVars | null
  params: Declaration[]

  constructor (
    pos: BasePosition,
    [, maybeTypeVars, param, rawParams]: schem.infer<typeof Arguments.schema>,
  ) {
    const typeVars = maybeTypeVars && maybeTypeVars[0]
    const params = [param, ...rawParams.map(([, param]) => param)]
    super(pos, [typeVars, ...params])
    this.typeVars = typeVars
    this.params = params
  }

  toString (): string {
    return `[${this.typeVars ? this.typeVars + ' ' : ''}${this.params.join(
      ' ',
    )}]`
  }

  static schema = schema.tuple([
    schema.any, // [ _
    schema.nullable(
      schema.tuple([
        schema.instance(TypeVars),
        schema.any, // _
      ]),
    ),
    schema.instance(Declaration),
    schema.array(
      schema.tuple([
        schema.any, // __
        schema.instance(Declaration),
      ]),
    ),
    schema.any, // _ ]
  ])
}