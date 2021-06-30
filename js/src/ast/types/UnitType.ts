import { unit } from '../../type-checker/types/builtins'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { GetTypeContext, GetTypeResult, Type } from './Type'

export class UnitType extends Base implements Type {
  constructor (pos: BasePosition, _: schem.infer<typeof UnitType.schema>) {
    super(pos)
  }

  getType (_context: GetTypeContext): GetTypeResult {
    return { type: unit }
  }

  toString (): string {
    return '()'
  }

  static schema = schema.tuple([schema.any, schema.any, schema.any])
}
