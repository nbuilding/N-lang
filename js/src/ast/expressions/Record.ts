import { CompilationScope } from '../../compiler/CompilationScope';
import { ErrorType } from '../../type-checker/errors/Error';
import { NRecord, unknown } from '../../type-checker/types/types';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { Identifier } from '../literals/Identifier';
import {
  CompilationResult,
  Expression,
  isExpression,
  TypeCheckContext,
  TypeCheckResult,
} from './Expression';
import { Spread } from './Spread';

export class RecordEntry extends Base {
  key: Identifier;
  value: Expression;

  constructor(
    pos: BasePosition,
    entry: schem.infer<typeof RecordEntry.schema>,
  ) {
    const pair: [Identifier, Expression] =
      entry.length === 3 ? [entry[0], entry[2]] : [entry[0], entry[0]];
    super(pos, [pair[0], entry.length === 3 ? pair[1] : null]);
    this.key = pair[0];
    this.value = pair[1];
  }

  toString(): string {
    return `${this.key}: ${this.value}`;
  }

  static schema = schema.union([
    schema.tuple([schema.instance(Identifier)]),
    schema.tuple([
      schema.instance(Identifier),
      schema.any,
      schema.guard(isExpression),
    ]),
  ]);
}

export class Record extends Base implements Expression {
  entries: RecordEntry[];
  private _type?: NRecord;

  constructor(
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof Record.schema>,
  ) {
    const entries = rawEntries
      ? [...rawEntries[0].map(([entry]) => entry), rawEntries[1]]
      : [];
    super(pos, entries);
    this.entries = entries;
  }

  typeCheck(context: TypeCheckContext): TypeCheckResult {
    let types = new Map();
    let exitPoint;
    for (const entry of this.entries) {
      const { type, exitPoint: exit } = context.scope.typeCheck(entry.value);
      if (entry.value instanceof Spread) {
        if (type.type === 'record') {
          types = new Map([
            ...Array.from(types.entries()),
            ...Array.from(type.types.entries()),
          ]);
        } else {
          types.set(entry.key.value, unknown);
          context.err({
            type: ErrorType.UNALLOWED_SPREAD,
          });
        }
      } else {
        if (types.has(entry.key.value)) {
          types.set(entry.key.value, unknown);
          context.err({
            type: ErrorType.RECORD_LITERAL_DUPE_KEY,
            key: entry.key.value,
          });
        } else {
          types.set(entry.key.value, type);
        }
      }
      if (!exitPoint) exitPoint = exit;
    }
    const type: NRecord = { type: 'record', types };
    this._type = type;
    return { type, exitPoint };
  }

  compile(scope: CompilationScope): CompilationResult {
    const mangledKeys = scope.context.normaliseRecord(this._type!);
    const statements: string[] = [];
    const entries: string[] = [];
    for (const entry of this.entries) {
      const { statements: s, expression } = entry.value.compile(scope);
      statements.push(...s);
      entries.push(`${mangledKeys[entry.key.value]}: ${expression}`);
    }
    return {
      statements,
      expression:
        entries.length > 0
          ? `{ ${entries.join(', ')} }`
          : // An empty record is basically like a unit type
            'undefined',
    };
  }

  toString(): string {
    return `{ ${this.entries.join('; ')} }`;
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
  ]);
}
