import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from "./base"
import { Identifier } from './literals'

export type Pattern = Identifier
  | TuplePattern
  | EnumPattern
  | ListPattern
  | DiscardPattern
  | RecordPattern
export function isPattern (value: any): value is Pattern {
  return value instanceof Identifier
    || value instanceof TuplePattern
    || value instanceof EnumPattern
    || value instanceof ListPattern
    || value instanceof DiscardPattern
    || value instanceof RecordPattern
}

export class TuplePattern extends Base {
  patterns: Pattern[]

  constructor (pos: BasePosition, [patterns, pattern]: schem.infer<typeof TuplePattern.schema>) {
    super(pos)
    this.patterns = [
      ...patterns.map(([pattern]) => pattern),
      pattern,
    ]
  }

  static schema = schema.tuple([
    schema.array(schema.tuple([
      schema.guard(isPattern),
      schema.any,
    ])),
    schema.guard(isPattern),
    schema.any,
  ])
}

export class EnumPattern extends Base {
  variant: string
  patterns: Pattern[]

  constructor (pos: BasePosition, [, variant, patterns]: schem.infer<typeof EnumPattern.schema>) {
    super(pos)
    this.variant = variant.value
    this.patterns = patterns.map(([, pattern]) => pattern)
  }

  static schema = schema.tuple([
    schema.any,
    schema.instance(Identifier),
    schema.array(schema.tuple([
      schema.any,
      schema.guard(isPattern),
    ])),
    schema.any,
  ])
}

export class ListPattern extends Base {
  patterns: Pattern[]

  constructor (pos: BasePosition, [, patterns]: schem.infer<typeof ListPattern.schema>) {
    super(pos)
    this.patterns = patterns ? [
      ...patterns[0].map(([pattern]) => pattern),
      patterns[1],
    ] : []
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(schema.tuple([
      schema.array(schema.tuple([
        schema.guard(isPattern),
        schema.any,
      ])),
      schema.guard(isPattern),
      schema.any,
    ])),
    schema.any,
  ])
}

export class DiscardPattern extends Base {
  constructor (pos: BasePosition, _: schem.infer<typeof DiscardPattern.schema>) {
    super(pos)
  }

  static schema = schema.tuple([
    schema.any,
  ])
}

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

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.nullable(schema.tuple([
      schema.any,
      schema.guard(isPattern),
    ])),
  ])
}

export class RecordPattern extends Base {
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
