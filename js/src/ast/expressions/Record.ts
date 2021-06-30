import { ErrorType } from '../../type-checker/errors/Error'
import { unknown } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression'

export class RecordEntry extends Base {
  key: Identifier
  value: Expression

  constructor (
    pos: BasePosition,
    entry: schem.infer<typeof RecordEntry.schema>,
  ) {
    const pair: [Identifier, Expression] =
      entry.length === 3 ? [entry[0], entry[2]] : [entry[0], entry[0]]
    super(pos, [pair[0], entry.length === 3 ? pair[1] : null])
    this.key = pair[0]
    this.value = pair[1]
  }

  toString (): string {
    return `${this.key}: ${this.value}`
  }

  static schema = schema.union([
    schema.tuple([schema.instance(Identifier)]),
    schema.tuple([
      schema.instance(Identifier),
      schema.any,
      schema.guard(isExpression),
    ]),
  ])
}

export class Record extends Base implements Expression {
  entries: RecordEntry[]

  constructor (
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof Record.schema>,
  ) {
    const entries = rawEntries
      ? [...rawEntries[0].map(([entry]) => entry), rawEntries[1]]
      : []
    super(pos, entries)
    this.entries = entries
  }

  typeCheck (context: TypeCheckContext): TypeCheckResult {
    const types = new Map()
    let exitPoint
    for (const entry of this.entries) {
      const { type, exitPoint: exit } = context.scope.typeCheck(entry.value)
      if (types.has(entry.key.value)) {
        types.set(entry.key.value, unknown)
        context.err({
          type: ErrorType.RECORD_LITERAL_DUPE_KEY,
          key: entry.key.value,
        })
      } else {
        types.set(entry.key.value, type)
      }
      if (!exitPoint) exitPoint = exit
    }
    return { type: { type: 'record', types }, exitPoint }
  }

  toString (): string {
    return `{ ${this.entries.join('; ')} }`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(schema.tuple([schema.instance(RecordEntry), schema.any])),
        schema.instance(RecordEntry),
        schema.any,
      ]),
    ),
    schema.any,
  ])
}
