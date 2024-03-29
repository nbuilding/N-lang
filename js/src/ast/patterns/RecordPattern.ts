import { CompilationScope } from '../../compiler/CompilationScope'
import { ErrorType } from '../../type-checker/errors/Error'
import { NModule, NRecord, unknown } from '../../type-checker/types/types'
import { AliasSpec } from '../../type-checker/types/TypeSpec'
import schema, * as schem from '../../utils/schema'
import { Base, BasePosition } from '../base'
import { Identifier } from '../literals/Identifier'
import {
  CheckPatternContext,
  CheckPatternResult,
  isPattern,
  Pattern,
  PatternCompilationResult,
} from './Pattern'

export class RecordPatternEntry extends Base {
  key: Identifier
  value: Pattern

  constructor (
    pos: BasePosition,
    entry: schem.infer<typeof RecordPatternEntry.schema>,
  ) {
    const pair: [Identifier, Pattern] =
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
      schema.guard(isPattern),
    ]),
  ])
}

export class RecordPattern extends Base implements Pattern {
  entries: RecordPatternEntry[]
  private _type?: NRecord | NModule

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
    if (resolved.type === 'record' || resolved.type === 'module') {
      this._type = resolved
      const keys: Set<string> = new Set()
      for (const entry of this.entries) {
        if (keys.has(entry.key.value)) {
          context.err(
            {
              type: ErrorType.RECORD_PATTERN_DUPE_KEY,
            },
            entry.key,
          )
        } else {
          keys.add(entry.key.value)
        }
        const value = resolved.types.get(entry.key.value)
        if (!value) {
          context.err(
            {
              type: ErrorType.RECORD_PATTERN_NO_KEY,
              recordType: resolved,
              key: entry.key.value,
            },
            entry.key,
          )
        }
        context.checkPattern(entry.value, value || unknown)
      }
    } else {
      if (resolved.type !== 'unknown') {
        context.err({
          type: ErrorType.PATTERN_MISMATCH,
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

  compilePattern (
    scope: CompilationScope,
    valueName: string,
  ): PatternCompilationResult {
    const statements: string[] = []
    const varNames: string[] = []
    const type = this._type!
    if (type.type === 'record') {
      const mangledKeys = scope.context.normaliseRecord(type)
      for (const entry of this.entries) {
        const { statements: s, varNames: v } = entry.value.compilePattern(
          scope,
          `${valueName}.${mangledKeys[entry.key.value]}`,
        )
        statements.push(...s)
        varNames.push(...v)
      }
    } else {
      const module = scope.context.getModule(type.path).names
      for (const entry of this.entries) {
        const exportName = module.get(entry.key.value)
        if (!exportName) {
          throw new ReferenceError(
            `Module ${type.path} does not define such name ${entry.key.value}`,
          )
        }
        const { statements: s, varNames: v } = entry.value.compilePattern(
          scope,
          exportName,
        )
        statements.push(...s)
        varNames.push(...v)
      }
    }
    return {
      statements,
      varNames,
    }
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
