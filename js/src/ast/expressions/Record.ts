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
    [key, maybeValue]: schem.infer<typeof RecordEntry.schema>,
  ) {
    super(pos, [key, maybeValue && maybeValue[1]])
    this.key = key
    this.value = maybeValue ? maybeValue[1] : key
  }

  toString (): string {
    return `${this.key}: ${this.value}`
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.tuple([schema.any, schema.guard(isExpression)])),
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
      // TODO: Duplicate keys
      types.set(entry.key.value, type)
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
