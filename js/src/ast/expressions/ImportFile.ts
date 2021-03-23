import schema, * as schem from '../../utils/schema'
import { Expression, TypeCheckContext, TypeCheckResult } from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { String as AstString } from '../literals/String'

export class ImportFile extends Base implements Expression {
  path: string
  oldSyntax: boolean

  constructor (
    pos: BasePosition,
    [, , path]: schem.infer<typeof ImportFile.schema>,
  ) {
    super(pos)
    this.path = path instanceof Identifier ? path.value + '.n' : path.value
    this.oldSyntax = path instanceof Identifier
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    throw new Error('Method not implemented.')
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
