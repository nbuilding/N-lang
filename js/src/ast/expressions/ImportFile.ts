import schema, * as schem from '../../utils/schema'
import { Expression, TypeCheckContext, TypeCheckResult } from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { String as AstString } from '../literals/String'

export class ImportFile extends Base implements Expression {
  path: Identifier | AstString

  constructor (
    pos: BasePosition,
    [, , path]: schem.infer<typeof ImportFile.schema>,
  ) {
    super(pos, [path])
    this.path = path
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
  }

  getImportPath (): string {
    return this.path instanceof Identifier
      ? this.path.value + '.n'
      : this.path.value
  }

  toString (): string {
    return `imp ${JSON.stringify(this.path)}`
  }

  static schema = schema.tuple([
    schema.any,
    schema.any,
    schema.guard((value: unknown): value is Identifier | AstString => {
      return value instanceof Identifier || value instanceof AstString
    }),
  ])
}
