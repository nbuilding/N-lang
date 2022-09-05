import { ErrorType } from '../../type-checker/errors/Error';
import { unknown } from '../../type-checker/types/types';
import schema, * as schem from '../../utils/schema';
import { Base, BasePosition } from '../base';
import { Identifier } from '../literals/Identifier';
import { GetTypeContext, GetTypeResult, isType, Type } from './Type';

export class RecordTypeEntry extends Base {
  key: Identifier;
  value: Type;

  constructor(
    pos: BasePosition,
    [key, , type]: schem.infer<typeof RecordTypeEntry.schema>,
  ) {
    super(pos, [key, type]);
    this.key = key;
    this.value = type;
  }

  toString(): string {
    return `${this.key}: ${this.value}`;
  }

  static schema = schema.tuple([
    schema.instance(Identifier),
    schema.any,
    schema.guard(isType),
  ]);
}

export class RecordType extends Base implements Type {
  entries: RecordTypeEntry[];

  constructor(
    pos: BasePosition,
    [, rawEntries]: schem.infer<typeof RecordType.schema>,
  ) {
    const entries = rawEntries
      ? [...rawEntries[0].map(([entry]) => entry), rawEntries[1]]
      : [];
    super(pos, entries);
    this.entries = entries;
  }

  getType(context: GetTypeContext): GetTypeResult {
    const types = new Map();
    for (const entry of this.entries) {
      const { type } = context.scope.getTypeFrom(entry.value);
      if (types.has(entry.key.value)) {
        context.err({
          type: ErrorType.RECORD_TYPE_DUPLICATE_KEY,
        });
        types.set(entry.key.value, unknown);
      } else {
        types.set(entry.key.value, type);
      }
    }
    return {
      type: {
        type: 'record',
        types: new Map(
          this.entries.map(entry => [
            entry.key.value,
            context.scope.getTypeFrom(entry.value).type,
          ]),
        ),
      },
    };
  }

  toString(): string {
    return `{ ${this.entries.join('; ')} }`;
  }

  static schema = schema.tuple([
    schema.any,
    schema.nullable(
      schema.tuple([
        schema.array(
          schema.tuple([schema.instance(RecordTypeEntry), schema.any]),
        ),
        schema.instance(RecordTypeEntry),
        schema.any,
      ]),
    ),
    schema.any,
  ]);
}
