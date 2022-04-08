import { CompiledModule } from '.'
import { CompilationContext } from '../compiler/CompilationContext'
import {
  bool,
  float,
  list,
  map,
  maybe,
  str,
} from '../type-checker/types/builtins'
import { makeFunction } from '../type-checker/types/types'
import { EnumSpec } from '../type-checker/types/TypeSpec'

export const value = EnumSpec.make('value', () => [
  ['null', []],
  ['string', [str]],
  ['number', [float]],
  ['boolean', [bool]],
])
// These are added separately because they contain json.value
value.variants.set('array', {
  types: [list.instance([value.instance()])],
  public: true,
})
value.variants.set('object', {
  types: [map.instance([str, value.instance()])],
  public: true,
})

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
    const jsonNull = context.genVarName('null')
    const string = context.genVarName('string')
    const number = context.genVarName('number')
    const boolean = context.genVarName('boolean')
    const array = context.genVarName('array')
    const object = context.genVarName('object')
    const parse = context.genVarName('parse')
    const parseSafe = context.genVarName('parseSafe')
    const stringify = context.genVarName('stringify')
    return {
      statements: [
        `function ${jsonNull}() {`,
        '  return [0, null];',
        '}',

        `function ${string}(str) {`,
        '  return [1, str];',
        '}',

        `function ${number}(float) {`,
        '  return [2, float];',
        '}',

        `function ${boolean}(bool) {`,
        '  return [3, bool];',
        '}',

        `function ${array}(list) {`,
        '  return [4, list];',
        '}',

        `function ${object}(map) {`,
        '  return [5, map];',
        '}',

        `function ${parse}(json) {`,
        '  try {',
        '    return jsValueToJson(JSON.parse(json));',
        '  } catch (_) {',
        '    return;',
        '  }',
        '}',

        `function ${parseSafe}(json) {`,
        '  try {',
        '    return [jsValueToJson(JSON.parse(json))];',
        '  } catch (_) {',
        '    return;',
        '  }',
        '}',

        `function ${stringify}(value) {`,
        '  // JSON.stringify: IE8+',
        '  return JSON.stringify(jsonValueToJs(value));',
        '}',
      ],
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
    }
  },
}
