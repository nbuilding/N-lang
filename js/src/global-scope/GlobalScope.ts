import { Scope } from '../type-checker/Scope'
import { TypeCheckerResultsForFile } from '../type-checker/TypeChecker'
import {
  str,
  int,
  float,
  char,
  list,
  map,
  cmd,
  boolSpec,
  maybe,
  result,
} from '../type-checker/types/builtins'
import { NType, makeFunction } from '../type-checker/types/types'
import { TypeSpec } from '../type-checker/types/TypeSpec'

const variables: Map<string, NType> = new Map()
const types: Map<string, TypeSpec> = new Map()

types.set('str', str.typeSpec)
types.set('int', int.typeSpec)
types.set('float', float.typeSpec)
types.set('char', char.typeSpec)

types.set('list', list)
types.set('map', map)
types.set('cmd', cmd)

types.set('bool', boolSpec)
variables.set('true', boolSpec.getConstructorType('true'))
variables.set('false', boolSpec.getConstructorType('false'))

types.set('maybe', maybe)
variables.set('yes', maybe.getConstructorType('yes'))
variables.set('none', maybe.getConstructorType('none'))

types.set('result', result)
variables.set('ok', result.getConstructorType('ok'))
variables.set('err', result.getConstructorType('err'))

variables.set(
  'intInBase10',
  makeFunction(() => [int, str]),
)
variables.set(
  'round',
  makeFunction(() => [float, int]),
)
variables.set(
  'floor',
  makeFunction(() => [float, int]),
)
variables.set(
  'ceil',
  makeFunction(() => [float, int]),
)
variables.set(
  'charCode',
  makeFunction(() => [char, int]),
)
variables.set(
  'intCode',
  makeFunction(() => [int, char]),
)
variables.set(
  'charAt',
  makeFunction(() => [int, str, maybe.instance([char])]),
)
variables.set(
  'substring',
  makeFunction(() => [int, int, str, str]),
)
variables.set(
  'len',
  makeFunction(t => [t, int], 't'),
)
variables.set(
  'split',
  makeFunction(() => [char, str, list.instance([char])]),
)
variables.set(
  'strip',
  makeFunction(() => [str, str]),
)
variables.set(
  'range',
  makeFunction(() => [int, int, int, list.instance([int])]),
)
variables.set(
  'print',
  makeFunction(t => [t, t], 't'),
)
variables.set(
  'itemAt',
  makeFunction(t => [int, list.instance([t]), maybe.instance([t])], 't'),
)
variables.set(
  'append',
  makeFunction(t => [t, list.instance([t]), list.instance([t])]),
)
variables.set(
  'filterMap',
  makeFunction(
    (a, b) => [
      makeFunction(() => [a, maybe.instance([b])]),
      list.instance([a]),
      list.instance([b]),
    ],
    'a',
    'b',
  ),
)
variables.set(
  'default',
  makeFunction(t => [t, maybe.instance([t]), t], 't'),
)
variables.set(
  'then',
  makeFunction(
    (a, b) => [
      makeFunction(() => [a, cmd.instance([b])]),
      cmd.instance([a]),
      cmd.instance([b]),
    ],
    'k',
    'v',
  ),
)
variables.set(
  'mapFrom',
  makeFunction(
    (k, v) => [
      list.instance([{ type: 'tuple', types: [k, v] }]),
      map.instance([k, v]),
    ],
    'k',
    'v',
  ),
)
variables.set(
  'getValue',
  makeFunction(
    (k, v) => [k, map.instance([k, v]), maybe.instance([v])],
    'k',
    'v',
  ),
)
variables.set(
  'entries',
  makeFunction(
    (k, v) => [
      map.instance([k, v]),
      list.instance([{ type: 'tuple', types: [k, v] }]),
    ],
    'k',
    'v',
  ),
)

export class GlobalScope extends Scope {
  constructor (results: TypeCheckerResultsForFile) {
    super(results)

    this.variables = variables
    this.types = types
  }
}
