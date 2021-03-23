import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import { CheckPatternContext, CheckPatternResult, isPattern, Pattern } from './Pattern'

export class RecordPatternEntry extends Base {
  key: string
  value: Pattern

  constructor (
    pos: BasePosition,
    [key, maybeValue]: schem.infer<typeof RecordPatternEntry.schema>,
  ) {
    super(pos)
    this.key = key.value
    this.value = maybeValue ? maybeValue[1] : key
  }

  toString () {
    return `${this.key}: ${this.value}`
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.tuple([
      schema.any,
      schema.guard(isPattern),
    ])),
  ])
}

export class RecordPattern extends Base implements Pattern {
  entries: RecordPatternEntry[]

  constructor (
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof RecordPattern.schema>,
  ) {
    const entries = rawEntries ? [
      ...rawEntries[0].map(([entry]) => entry),
      rawEntries[1],
    ] : []
    super(pos, entries)
    this.entries = entries
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    throw new Error('Method not implemented.')
  }

  toString () {
    return `{ ${this.entries.join('; ')} }`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.instance(RecordPatternEntry),
        schema.any,
      ])),
      schema.instance(RecordPatternEntry),
      schema.any,
    ])),
    schema.any,
  ])
}
