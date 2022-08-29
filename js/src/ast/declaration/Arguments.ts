import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Declaration } from './Declaration'
import { TypeVars } from './TypeVars'

export class Arguments extends Base {
  typeVars: TypeVars | null
  params: Declaration[]

  constructor (
    pos: BasePosition,
    [maybeTypeVars, , maybeParams]: schem.infer<typeof Arguments.schema>,
  ) {
    const typeVars = maybeTypeVars && maybeTypeVars[1]
    const params = maybeParams
      ? [maybeParams[1], ...maybeParams[2].map(([, param]) => param)]
      : []
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
    schema.nullable(
      schema.tuple([
        schema.any, // [ _
        schema.instance(TypeVars),
        schema.any, // _ ] _
      ]),
    ),
    schema.any, // (
    schema.nullable(
      schema.tuple([
        schema.any, // _
        schema.instance(Declaration),
        schema.array(
          schema.tuple([
            schema.any, // _ , _
            schema.instance(Declaration),
          ]),
        ),
        schema.nullable(schema.any) // _ ,
      ]),
    ),
    schema.any, // _ )
  ])
}
