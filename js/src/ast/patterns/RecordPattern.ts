import { ErrorType } from '../../type-checker/errors/Error'
import { AliasSpec, unknown } from '../../type-checker/types/types'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
} from './Pattern'

export class RecordPatternEntry extends Base {
  key: Identifier
  value: Pattern

  constructor (
    pos: BasePosition,
    [key, maybeValue]: schem.infer<typeof RecordPatternEntry.schema>,
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
    schema.nullable(schema.tuple([schema.any, schema.guard(isPattern)])),
  ])
}

export class RecordPattern extends Base implements Pattern {
  entries: RecordPatternEntry[]

  constructor (
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof RecordPattern.schema>,
  ) {
    const entries = rawEntries
      ? [...rawEntries[0].map(([entry]) => entry), rawEntries[1]]
      : []
    super(pos, entries)
    this.entries = entries
  }

  checkPattern (context: CheckPatternContext): CheckPatternResult {
    const resolved = AliasSpec.resolve(context.type)
    if (resolved.type === 'record') {
      const keys = new Set(resolved.types.keys())
      for (const entry of this.entries) {
        keys.delete(entry.key.value) // TODO: Duplicate keys
        const value = resolved.types.get(entry.key.value)
        if (!value) {
          context.err(
            {
              type: ErrorType.RECORD_DESTRUCTURE_NO_KEY,
              recordType: resolved,
              key: entry.key.value,
            },
            entry.key,
          )
        }
        context.checkPattern(entry.value, value || unknown)
      }
      if (keys.size > 0) {
        context.err({
          type: ErrorType.RECORD_DESTRUCTURE_INCOMPLETE,
          recordType: resolved,
          keys: Array.from(keys),
        })
      }
    } else {
      if (resolved.type !== 'unknown') {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: context.type,
          destructure: 'record',
        })
      }
      for (const entry of this.entries) {
        context.checkPattern(entry.value, unknown)
      }
    }
    return {}
  }

  toString (): string {
    return `{ ${this.entries.join('; ')} }`
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(
          schema.tuple([schema.instance(RecordPatternEntry), schema.any]),
        ),
        schema.instance(RecordPatternEntry),
        schema.any,
      ]),
    ),
    schema.any,
  ])
}
