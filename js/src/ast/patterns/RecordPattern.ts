import { ErrorType } from '../../type-checker/errors/Error'
import { NType, Record } from '../../type-checker/types/types'
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
    const keys: Set<string> = new Set()
    let type: Record | null = null
    if (context.type) {
      if (context.type instanceof Record) {
        type = context.type
      } else {
        context.err({
          type: ErrorType.DESTRUCTURE_TYPE_MISMATCH,
          assignedTo: context.type,
          destructure: 'record',
        })
      }
    }
    for (const entry of this.entries) {
      if (keys.has(entry.key.value)) {
        context.err(
          {
            type: ErrorType.RECORD_DESTRUCTURE_DUPLICATE_KEY,
            key: entry.key.value,
          },
          entry.key,
        )
      } else {
        keys.add(entry.key.value)
      }
      if (type) {
        const value = type.types.get(entry.key.value)
        if (value === undefined) {
          context.err(
            {
              type: ErrorType.RECORD_DESTRUCTURE_NO_KEY,
              recordType: type,
              key: entry.key.value,
            },
            entry.key,
          )
        }
        context.scope.checkPattern(entry.value, value || null, context.definite)
      } else {
        context.scope.checkPattern(entry.value, null, context.definite)
      }
    }
    if (type) {
      const unusedKeys = new Set(type.types.keys())
      for (const key of keys) {
        unusedKeys.delete(key)
      }
      if (unusedKeys.size > 0) {
        context.err({
          type: ErrorType.RECORD_DESTRUCTURE_INCOMPLETE,
          keys: Array.from(unusedKeys),
        })
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
