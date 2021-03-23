import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Arguments } from '../declaration/Arguments'
import { Identifier } from '../literals/Identifier'
import { Block } from './Block'
import {
  CheckStatementContext,
  CheckStatementResult,
  Statement,
} from './Statement'

export class ClassDeclaration extends Base implements Statement {
  public: boolean
  name: string
  arguments: Arguments
  body: Block

  constructor (
    pos: BasePosition,
    [, pub, name, , args, , body]: schem.infer<typeof ClassDeclaration.schema>,
  ) {
    super(pos, [body])
    this.public = pub !== null
    this.name = name.value
    this.arguments = args
    this.body = body
  }

  checkStatement (context: CheckStatementContext): CheckStatementResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return `class${this.public ? ' pub' : ''} ${this.name} ${this.arguments} ${
      this.body
    }`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([schema.any, schema.any])),
    schema.instance(Identifier),
    schema.any,
    schema.instance(Arguments),
    schema.any,
    schema.instance(Block),
    schema.any,
  ])
}
