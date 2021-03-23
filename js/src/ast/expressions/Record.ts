import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { RecordEntry } from './RecordEntry'

export class Record extends Base {
  entries: RecordEntry[]

  constructor (
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof Record.schema>,
  ) {
    const entries = rawEntries ? [
      ...rawEntries[0].map(([entry]) => entry),
      rawEntries[1],
    ] : []
    super(pos, entries)
    this.entries = entries
  }

  toString () {
    return `{ ${this.entries.join('; ')} }`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.instance(RecordEntry),
        schema.any,
      ])),
      schema.instance(RecordEntry),
      schema.any,
    ])),
    schema.any,
  ])
}
