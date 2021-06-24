import schema, * as schem from '../../utils/schema'
import { Expression, TypeCheckContext, TypeCheckResult } from './Expression'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { String as AstString } from '../literals/String'
import { unknown } from '../../type-checker/types/types'
import { ErrorType } from '../../type-checker/errors/Error'
import { NOT_FOUND } from '../../type-checker/TypeChecker'

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
    const state = context.scope.results.modules.get(this.getImportPath())
    if (!state) {
      throw new Error('Why does state not exist?')
    }
    if (state.state === 'loaded') {
      return { type: state.module }
    } else {
      if (state.state === 'error') {
        context.err({
          type: ErrorType.CANNOT_IMPORT,
          reason: state.error === NOT_FOUND ? 'not-found' : 'bad-path',
        })
      } else if (state.state === 'loading') {
        context.err({ type: ErrorType.CIRCULAR_IMPORTS })
      }
      return { type: unknown }
    }
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
