import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
} from './Pattern'

export class EnumPattern extends Base implements Pattern {
  variant: string
  patterns: Pattern[]

  constructor (
    pos: BasePosition,
    [, variant, patterns]: schem.infer<typeof EnumPattern.schema>,
  ) {
    super(pos)
    this.variant = variant.value
    this.patterns = patterns.map(([, pattern]) => pattern)
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return `<${this.variant}${this.patterns
      .map(pattern => ' ' + pattern)
      .join('')}>`
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Identifier),
    schema.array(schema.tuple([schema.any, schema.guard(isPattern)])),
    schema.any,
  ])
}
