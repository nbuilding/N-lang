import { CompiledModule } from '.';
import { CompilationContext } from '../compiler/CompilationContext';
import {
  bool,
  float,
  list,
  map,
  maybe,
  str,
} from '../type-checker/types/builtins';
import { makeFunction } from '../type-checker/types/types';
import { EnumSpec } from '../type-checker/types/TypeSpec';

export const value = EnumSpec.make('value', () => [
  ['null', []],
  ['string', [str]],
  ['number', [float]],
  ['boolean', [bool]],
]);
// These are added separately because they contain json.value
value.variants.set('array', {
  types: [list.instance([value.instance()])],
  public: true,
});
value.variants.set('object', {
  types: [map.instance([str, value.instance()])],
  public: true,
});

export default {
  variables: {
    // json.value enum constructors
    null: value.getConstructorType('null'),
    string: value.getConstructorType('string'),
    number: value.getConstructorType('number'),
    boolean: value.getConstructorType('boolean'),
    array: value.getConstructorType('array'),
    object: value.getConstructorType('object'),

    // JSON parsing/stringifying
    parse: makeFunction(() => [str, value.instance()]),
    parseSafe: makeFunction(() => [str, maybe.instance([value.instance()])]),
    stringify: makeFunction(() => [value.instance(), str]),
  },
  types: {
    value,
  },

  compile(context: CompilationContext): CompiledModule {
    const jsonNull = context.require('null');
    const string = context.require('string');
    const number = context.require('number');
    const boolean = context.require('boolean');
    const array = context.require('array');
    const object = context.require('object');
    const parse = context.require('parse');
    const parseSafe = context.require('parseSafe');
    const stringify = context.require('stringify');
    return {
      statements: [],
      exports: {
        null: jsonNull,
        string,
        number,
        boolean,
        array,
        object,
        parse,
        parseSafe,
        stringify,
      },
    };
  },
};
