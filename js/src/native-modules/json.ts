import {
  bool,
  float,
  list,
  map,
  maybe,
  str,
} from '../type-checker/types/builtins'
import { EnumSpec, makeFunction } from '../type-checker/types/types'

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
}
